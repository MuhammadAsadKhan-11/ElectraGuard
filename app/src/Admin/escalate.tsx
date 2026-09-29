// app/src/Admin/escalate.tsx
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, getCaseStatusColor, getRiskColor } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import { escalateCase, useCaseDetail } from "../../../hooks/useCasesApi";

type EscalationLevel = "Supervisor" | "Department Head" | "Legal / Enforcement";
const ESCALATION_LEVELS: EscalationLevel[] = ["Supervisor", "Department Head", "Legal / Enforcement"];

type Reason = "High Risk Confirmed" | "Consumer Uncooperative" | "Evidence of Organized Theft" | "Repeat Offender" | "Other";
const REASONS: Reason[] = [
  "High Risk Confirmed",
  "Consumer Uncooperative",
  "Evidence of Organized Theft",
  "Repeat Offender",
  "Other",
];

interface UploadedFile {
  uri: string;
  name: string;
  type: "image" | "document";
  mimeType?: string;
}

function Dropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: T[];
  value: T | "";
  onChange: (v: T) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label} *</Text>
      <TouchableOpacity style={dd.btn} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={[dd.btnText, !value && { color: Colors.textSecondary }]}>{value || placeholder}</Text>
        <Text style={dd.arrow}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={dd.menu}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[dd.item, value === opt && dd.itemActive]}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <Text style={[dd.itemText, value === opt && dd.itemTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  btn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  btnText: { fontSize: 14, color: Colors.text },
  arrow: { fontSize: 11, color: Colors.textSecondary },
  menu: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    zIndex: 99,
  },
  item: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemActive: { backgroundColor: Colors.primary + "12" },
  itemText: { fontSize: 14, color: Colors.text },
  itemTextActive: { color: Colors.primary, fontWeight: "600" },
});

export default function EscalateCaseScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).escalate;

  const params = useLocalSearchParams();
  const rawId = params.caseId as string | string[] | undefined;
  const caseId = Array.isArray(rawId) ? rawId[0] : rawId ?? null;

  const { caseItem, loading } = useCaseDetail(caseId);

  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel | "">("");
  const [reason, setReason] = useState<Reason | "">("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/src/Admin/CasesScreen" as any));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `image_${Date.now()}.jpg`,
          type: "image" as const,
          mimeType: a.mimeType || "image/jpeg",
        })),
      ]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: true });
    if (!result.canceled) {
      setFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          type: "document" as const,
          mimeType: a.mimeType || "application/octet-stream",
        })),
      ]);
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleConfirm = () => {
    if (!caseId) return;
    if (!escalationLevel || !reason || !description.trim()) {
      Alert.alert(S.missingFieldsTitle, S.missingFieldsMsg);
      return;
    }
    Alert.alert(
      S.confirmTitle,
      S.confirmMsg,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Escalate",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await escalateCase(caseId, {
                escalationLevel,
                reason,
                description: description.trim(),
                files,
              });
              // Backend: case ka riskLevel/priority update karta hai, evidence
              // save karta hai, aur consumer ko escalation ki notification bhejta hai.
              Alert.alert(S.escalatedTitle, S.escalatedMsg, [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert(S.errorTitle, err.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !caseItem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getCaseStatusColor(caseItem.status);
  const riskColor = getRiskColor(caseItem.riskLevel);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{S.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Case Summary */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.caseSummary}</Text>
          <Text style={[styles.cardSub, { color: colors.subText }]}>{S.reviewBeforeEscalation}</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>{S.caseId}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{caseItem.caseNumber}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>{S.consumerId}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{caseItem.consumerId}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>{S.currentStatus}</Text>
            <View style={[styles.badge, { backgroundColor: statusColor + "20", borderColor: statusColor, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{caseItem.status}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>{S.riskLevel}</Text>
            <View style={[styles.badge, { backgroundColor: riskColor + "20", borderColor: riskColor, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: riskColor }]}>{caseItem.riskLevel}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>{S.assignedInspector}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{caseItem.inspector || "Unassigned"}</Text>
          </View>
        </View>

        {/* Escalation Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.escalationDetails}</Text>
          <Text style={[styles.cardSub, { color: colors.subText }]}>{S.provideJustification}</Text>

          <Dropdown
            label={S.escalationLevel}
            options={ESCALATION_LEVELS}
            value={escalationLevel}
            onChange={setEscalationLevel}
            placeholder={S.selectLevel}
          />
          <Dropdown label={S.reasonForEscalation} options={REASONS} value={reason} onChange={setReason} placeholder={S.selectReason} />

          <View style={styles.fieldWrap}>
            <Text style={dd.label}>{S.description}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={S.ph_description}
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.uploadSection}>
            <Text style={dd.label}>{S.attachAdditional}</Text>
            <View style={styles.uploadBtnRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
                <Text style={styles.uploadBtnIcon}>🖼</Text>
                <Text style={styles.uploadBtnText}>{S.uploadImage}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadBtn, styles.uploadBtnDoc]} onPress={pickDocument} activeOpacity={0.8}>
                <Text style={styles.uploadBtnIcon}>📄</Text>
                <Text style={[styles.uploadBtnText, { color: Colors.primary }]}>{S.uploadDocument}</Text>
              </TouchableOpacity>
            </View>
            {files.length > 0 && (
              <View style={styles.fileList}>
                {files.map((f, i) => (
                  <View key={i} style={styles.fileItem}>
                    <Text style={styles.fileIcon}>{f.type === "image" ? "🖼" : "📄"}</Text>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeFile(i)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>{S.importantNotice}</Text>
            <Text style={styles.noticeText}>
              {S.noticeText}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.submitLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.confirmBtnText}>{S.escalating}</Text>
              </View>
            ) : (
              <Text style={styles.confirmBtnText}>{S.confirmEscalation}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={goBack} disabled={submitting}>
            <Text style={[styles.cancelBtnText, { color: colors.subText }]}>{S.cancel}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
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
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 14 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: "600", color: Colors.text },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  fieldWrap: { marginBottom: 16 },
  input: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: { height: 110, paddingTop: 12 },
  uploadSection: { marginTop: 4 },
  uploadBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  uploadBtnDoc: { backgroundColor: Colors.primary + "15", borderWidth: 1, borderColor: Colors.primary },
  uploadBtnIcon: { fontSize: 16 },
  uploadBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  fileList: { marginTop: 12, gap: 8 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  fileIcon: { fontSize: 18 },
  fileName: { flex: 1, fontSize: 13, color: Colors.text },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: Colors.danger, fontWeight: "600" },
  noticeBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFF4E8",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  noticeIcon: { fontSize: 18 },
  noticeTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  noticeText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  form: { paddingHorizontal: 16 },
  confirmBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: Colors.danger,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
});
