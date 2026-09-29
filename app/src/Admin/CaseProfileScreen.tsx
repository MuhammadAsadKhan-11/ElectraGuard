// app/src/Admin/CaseProfileScreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, getCaseStatusColor, getRiskColor } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import {
  assignInspector,
  closeCase,
  useCaseDetail,
  useInspectors,
} from "../../../hooks/useCasesApi";

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
          </View>
          {caseItem.evidence.length === 0 ? (
            <Text style={[styles.noEvidence, { color: colors.subText }]}>{S.noEvidence}</Text>
          ) : (
            caseItem.evidence.map((ev, i) => (
              <TouchableOpacity
                key={i}
                style={styles.evidenceItem}
                onPress={() => router.push({ pathname: "/src/Admin/EvidenceViewerScreen", params: { url: ev.url, type: ev.type, name: ev.name } } as any)}
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
                  </Text>
                </View>
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
  safe: { flex: 1, backgroundColor: Colors.bg },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    padding: 16,
    margin: 16,
    marginTop: 40,
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
  assignBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 4 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  assignModal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textSecondary },
});
