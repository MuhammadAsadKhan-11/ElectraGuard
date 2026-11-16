// app/src/Admin/CaseProfileScreen.tsx
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, getCaseStatusColor, getRiskColor } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import {
  CaseStatus,
  EVIDENCE_MAX_FILES,
  EVIDENCE_PICKER_TYPES,
  EvidenceItemDTO,
  addCaseRemark,
  addEvidence,
  assignInspector,
  checkEvidenceFile,
  closeCase,
  getEvidenceUrl,
  updateCaseStatus,
  useCaseDetail,
  useInspectors,
} from "../../../hooks/useCasesApi";
import { openEvidence } from "../../../utils/evidenceDownload";

const STATUS_OPTIONS: CaseStatus[] = ["Open", "In Progress", "Closed", "Rejected"];

export default function CaseProfileScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).caseProfile;

  const params = useLocalSearchParams();
  const rawId = params.caseId as string | string[] | undefined;
  const caseId = Array.isArray(rawId) ? rawId[0] : rawId ?? null;

  const { caseItem, loading, refreshing, error, pullRefresh, reload } = useCaseDetail(caseId);
  const { inspectors } = useInspectors();

  const [assignModal, setAssignModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  // ── Evidence: open / download via short-lived presigned URLs ────
  const openEvidenceItem = (ev: EvidenceItemDTO) => {
    if (!caseId) return;
    router.push({
      pathname: "/src/Admin/EvidenceViewerScreen",
      params: ev.url
        ? { url: ev.url, type: ev.type, name: ev.name }
        : { caseId, evidenceId: ev.id, type: ev.type, name: ev.name },
    } as any);
  };

  const downloadEvidenceItem = async (ev: EvidenceItemDTO) => {
    if (!caseId || downloading) return;
    setDownloading(ev.id);
    try {
      if (ev.url) {
        await openEvidence(async () => ({ url: ev.url, expiresIn: 0, fileName: ev.name, contentType: ev.fileType || "" }), "download");
      } else {
        await openEvidence((d) => getEvidenceUrl(caseId, ev.id, d), "download");
      }
    } catch (err: any) {
      Alert.alert(S.error, err?.message || "Could not download the file.");
    } finally {
      setDownloading(null);
    }
  };

  // ── Evidence: upload more files to this case (S3) + notify consumer ──
  const uploadPicked = async (files: { uri: string; name: string; mimeType?: string; size?: number | null }[]) => {
    if (!caseId || !files.length) return;
    if (files.length > EVIDENCE_MAX_FILES) {
      Alert.alert(S.error, `Upload at most ${EVIDENCE_MAX_FILES} files at a time.`);
      return;
    }
    const problem = files.map(checkEvidenceFile).find(Boolean);
    if (problem) {
      Alert.alert(S.error, problem);
      return;
    }
    try {
      setBusy(true);
      setUploadPct(0);
      await addEvidence(caseId, files, "", (f) => setUploadPct(f));
      await reload();
      Alert.alert("Evidence uploaded", `${files.length} file(s) added. The consumer has been notified.`);
    } catch (err: any) {
      Alert.alert(S.error, err?.message || "Upload failed.");
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  };

  const pickEvidence = () => {
    Alert.alert("Add evidence", "Choose what to upload", [
      {
        text: "Images",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== "granted") {
            Alert.alert("Permission Required", "Please allow access to your photo library.");
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85 });
          if (!res.canceled) {
            uploadPicked(
              res.assets.map((a, i) => ({
                uri: a.uri,
                name: a.fileName || `image_${Date.now()}_${i}.jpg`,
                mimeType: a.mimeType || "image/jpeg",
                size: a.fileSize,
              })),
            );
          }
        },
      },
      {
        text: "Documents",
        onPress: async () => {
          const res = await DocumentPicker.getDocumentAsync({ type: EVIDENCE_PICKER_TYPES, multiple: true, copyToCacheDirectory: true });
          if (!res.canceled) {
            uploadPicked(res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size })));
          }
        },
      },
      { text: S.cancel, style: "cancel" },
    ]);
  };

  // ── Status + remarks (both notify the consumer) ──────────────────
  const handleStatus = (status: CaseStatus) => {
    if (!caseId || !caseItem || caseItem.status === status) return;
    Alert.alert("Change status", `Set case status to "${status}"? The consumer will be notified.`, [
      { text: S.cancel, style: "cancel" },
      {
        text: "Update",
        onPress: async () => {
          try {
            setBusy(true);
            await updateCaseStatus(caseId, status);
            await reload();
          } catch (err: any) {
            Alert.alert(S.error, err?.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleRemark = async () => {
    if (!caseId || !remark.trim()) return;
    try {
      setBusy(true);
      await addCaseRemark(caseId, remark.trim(), true);
      setRemark("");
      await reload();
      Alert.alert("Update sent", "The remark was added to the case and sent to the consumer.");
    } catch (err: any) {
      Alert.alert(S.error, err?.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Fix: use router.canGoBack()/back() (works under Expo Router,
  // unlike the old navigation.goBack() which had no `navigation` prop here
  // and silently failed to render/act — that was the missing back-arrow bug).
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/src/Admin/CasesScreen" as any);
  };

  const handleAssign = async (inspectorName: string) => {
    if (!caseId) return;
    try {
      setBusy(true);
      await assignInspector(caseId, inspectorName);
      setAssignModal(false);
      await reload();
      Alert.alert(S.assignedTitle, S.assignedMsg(inspectorName));
    } catch (err: any) {
      Alert.alert(S.error, err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (!caseId) return;
    Alert.alert(S.closeConfirmTitle, S.closeConfirmMsg, [
      { text: S.cancel, style: "cancel" },
      {
        text: S.close,
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await closeCase(caseId);
            // Backend marks status "Closed" AND notifies the consumer.
            router.back();
          } catch (err: any) {
            Alert.alert(S.error, err.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleEscalate = () => {
    if (!caseId) return;
    router.push({ pathname: "/src/Admin/escalate", params: { caseId } } as any);
  };

  if (loading && !caseItem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{S.loadingCase}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!caseItem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>{error || S.notFound}</Text>
          <TouchableOpacity onPress={goBack} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.primary, fontWeight: "600" }}>{S.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getCaseStatusColor(caseItem.status);
  const riskColor = getRiskColor(caseItem.riskLevel);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Inspector Assign Modal */}
      <Modal visible={assignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{S.assignInspector}</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {inspectors.map((ins) => (
              <TouchableOpacity
                key={ins.id}
                style={styles.inspectorRow}
                onPress={() => ins.available && handleAssign(ins.name)}
                activeOpacity={ins.available ? 0.75 : 1}
                disabled={busy}
              >
                <View style={styles.inspectorInfo}>
                  <Text style={styles.inspectorIcon}>👤</Text>
                  <View>
                    <Text style={[styles.inspectorName, { color: colors.text }]}>{ins.name}</Text>
                    <Text style={[styles.inspectorArea, { color: colors.subText }]}>{ins.area}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.assignBtn,
                    {
                      backgroundColor:
                        caseItem.inspector === ins.name
                          ? Colors.success
                          : ins.available
                          ? Colors.primary
                          : Colors.border,
                    },
                  ]}
                >
                  <Text style={styles.assignBtnText}>
                    {caseItem.inspector === ins.name ? S.assigned : ins.available ? S.assign : S.busy}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.caseNumber, { color: colors.text }]}>{caseItem.caseNumber}</Text>
            <Text style={[styles.caseName, { color: colors.subText }]}>
              {caseItem.consumerName} • {caseItem.meterNumber || caseItem.consumerId}
            </Text>
          </View>
          <View style={styles.headerBadges}>
            <View style={[styles.badge, { backgroundColor: statusColor + "20", borderColor: statusColor, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{caseItem.status}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: riskColor + "15", marginTop: 4 }]}>
              <Text style={[styles.badgeText, { color: riskColor }]}>{caseItem.riskLevel}</Text>
            </View>
          </View>
        </View>

        {/* Case Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.caseDetails}</Text>
          <Text style={[styles.caseDesc, { color: colors.subText }]}>{caseItem.description}</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={[styles.detailLabel, { color: colors.subText }]}>Area</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{caseItem.area}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={[styles.detailLabel, { color: colors.subText }]}>Created</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{caseItem.createdAt}</Text>
            </View>
            {caseItem.category && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏷</Text>
                <Text style={[styles.detailLabel, { color: colors.subText }]}>Category</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{caseItem.category}</Text>
              </View>
            )}
            {caseItem.priority && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⚡</Text>
                <Text style={[styles.detailLabel, { color: colors.subText }]}>Priority</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{caseItem.priority}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Timeline */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.timeline}</Text>
          {caseItem.timeline.length === 0 ? (
            <Text style={[styles.noEvidence, { color: colors.subText }]}>{S.noTimeline}</Text>
          ) : (
            caseItem.timeline.map((t, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineDotCol}>
                  <View style={[styles.timelineDot, { backgroundColor: i === 0 ? Colors.primary : Colors.border }]} />
                  {i < caseItem.timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineAction, { color: colors.text }]}>{t.action}</Text>
                  <Text style={[styles.timelineDate, { color: colors.subText }]}>
                    {t.date} {t.time}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Evidence — images & PDFs the admin attached */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.evidenceHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{S.evidence(caseItem.evidence.length)}</Text>
            <TouchableOpacity style={styles.assignModalBtn} onPress={pickEvidence} disabled={busy}>
              <Text style={styles.assignModalBtnText}>
                {uploadPct !== null ? `Uploading ${Math.round(uploadPct * 100)}%` : "+ Add"}
              </Text>
            </TouchableOpacity>
          </View>
          {uploadPct !== null && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(uploadPct * 100)}%` }]} />
            </View>
          )}
          {caseItem.evidence.length === 0 ? (
            <Text style={[styles.noEvidence, { color: colors.subText }]}>{S.noEvidence}</Text>
          ) : (
            caseItem.evidence.map((ev, i) => (
              <TouchableOpacity
                key={ev.id || i}
                style={styles.evidenceItem}
                onPress={() => openEvidenceItem(ev)}
              >
                <View style={styles.evidenceIconBox}>
                  <Text style={styles.evidenceIcon}>{ev.type === "image" ? "🖼" : "📄"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.evidenceName, { color: colors.text }]} numberOfLines={1}>
                    {ev.name}
                  </Text>
                  <Text style={[styles.evidenceMeta, { color: colors.subText }]}>
                    {ev.uploadedBy || "Admin"} • {ev.date || caseItem.createdAt}
                    {ev.size ? ` • ${(ev.size / 1048576).toFixed(ev.size > 1048576 ? 1 : 2)} MB` : ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => downloadEvidenceItem(ev)} hitSlop={8} style={styles.downloadBtn}>
                  {downloading === ev.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.downloadText}>⬇</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Assign Inspector */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.assignHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{S.assignInspector}</Text>
            <TouchableOpacity style={styles.assignModalBtn} onPress={() => setAssignModal(true)}>
              <Text style={styles.assignModalBtnText}>{S.change}</Text>
            </TouchableOpacity>
          </View>
          {caseItem.inspector ? (
            <View style={styles.inspectorRow}>
              <View style={styles.inspectorInfo}>
                <Text style={styles.inspectorIcon}>👤</Text>
                <Text style={[styles.inspectorName, { color: colors.text }]}>{caseItem.inspector}</Text>
              </View>
              <View style={[styles.assignBtn, { backgroundColor: Colors.success }]}>
                <Text style={styles.assignBtnText}>Assigned</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.noEvidence, { color: Colors.warning }]}>{S.unassignedTapChange}</Text>
          )}
        </View>

        {/* Case update: status + remark (consumer is notified) */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Update case</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((st) => {
              const active = caseItem.status === st;
              const c = getCaseStatusColor(st);
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusChip, { borderColor: c }, active && { backgroundColor: c }]}
                  onPress={() => handleStatus(st)}
                  disabled={busy || active}
                >
                  <Text style={[styles.statusChipText, { color: active ? "#FFFFFF" : c }]}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[styles.remarkInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Remark or instruction for the consumer"
            placeholderTextColor={Colors.textSecondary}
            value={remark}
            onChangeText={setRemark}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendRemarkBtn, (!remark.trim() || busy) && { opacity: 0.5 }]}
            onPress={handleRemark}
            disabled={!remark.trim() || busy}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionBtnText}>Send update to consumer</Text>}
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.success }]}
            onPress={handleClose}
            disabled={busy}
          >
            <Text style={styles.actionBtnText}>{S.closeCase}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.danger }]}
            onPress={handleEscalate}
            disabled={busy}
          >
            <Text style={styles.actionBtnText}>{S.escalate}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged, back-arrow style untouched) ─────────────
const styles = StyleSheet.create({
  progressTrack: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: 6, backgroundColor: Colors.primary },
  downloadBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  downloadText: { fontSize: 18, color: Colors.primary },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 12 },
  statusChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  statusChipText: { fontSize: 12, fontWeight: "700" },
  remarkInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: "top", fontSize: 14 },
  sendRemarkBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  safe: { flex: 1, backgroundColor: Colors.bg },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    padding: 16,
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  headerInfo: { flex: 1 },
  caseNumber: { fontSize: 18, fontWeight: "700", color: Colors.text },
  caseName: { fontSize: 12, color: Colors.textSecondary },
  headerBadges: { alignItems: "flex-end" },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  caseDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  detailItem: { minWidth: "45%" },
  detailIcon: { fontSize: 16, marginBottom: 4 },
  detailLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "600", color: Colors.text },
  timelineRow: { flexDirection: "row", marginBottom: 4 },
  timelineDotCol: { alignItems: "center", width: 24, marginRight: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineAction: { fontSize: 13, fontWeight: "500", color: Colors.text, lineHeight: 18 },
  timelineDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  evidenceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  noEvidence: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", padding: 16 },
  evidenceItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  evidenceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  evidenceIcon: { fontSize: 22 },
  evidenceName: { fontSize: 13, fontWeight: "600", color: Colors.text },
  evidenceMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  assignHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  assignModalBtn: {
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  assignModalBtnText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  inspectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inspectorInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  inspectorIcon: { fontSize: 20 },
  inspectorName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  inspectorArea: { fontSize: 12, color: Colors.textSecondary },
  assignBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  assignBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 4 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  assignModal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textSecondary },
});
