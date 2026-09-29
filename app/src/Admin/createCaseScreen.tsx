// app/src/Admin/createCaseScreen.tsx
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors as AppColors } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import { createCase } from "../../../hooks/useCasesApi";

// Fallbacks: agar Colors.ts mein koi key missing ho to TypeScript/runtime error na aaye.
const Colors = {
  primary: "#2563eb",
  text: "#111827",
  textSecondary: "#6b7280",
  white: "#ffffff",
  bg: "#f5f6fa",
  border: "#e5e7eb",
  danger: "#ef4444",
  ...(AppColors as Record<string, string>),
};

type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type CaseCategory =
  | "Meter Tampering"
  | "Illegal Connection"
  | "Billing Fraud"
  | "Service Theft"
  | "Other";
type Priority = "Low" | "Normal" | "High" | "Urgent";

interface UploadedFile {
  uri: string;
  name: string;
  type: "image" | "document";
  mimeType?: string;
}

const RISK_LEVELS: RiskLevel[] = ["Low", "Medium", "High", "Critical"];
const CASE_CATEGORIES: CaseCategory[] = [
  "Meter Tampering",
  "Illegal Connection",
  "Billing Fraud",
  "Service Theft",
  "Other",
];
const PRIORITIES: Priority[] = ["Low", "Normal", "High", "Urgent"];

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
      <TouchableOpacity style={dd.btn} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <Text style={[dd.btnText, !value && { color: Colors.textSecondary }]}>
          {value || placeholder}
        </Text>
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
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemActive: { backgroundColor: Colors.primary + "12" },
  itemText: { fontSize: 14, color: Colors.text },
  itemTextActive: { color: Colors.primary, fontWeight: "600" },
});

const firstParam = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) || "";

export default function CreateCaseScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).createCase;

  // Consumer Profile screen se "Create Case" par tap karne par consumerId/consumerName
  // params se aate hain — pehle se fill kar dete hain.
  const routeParams = useLocalSearchParams<{
    consumerId?: string | string[];
    consumerName?: string | string[];
  }>();
  const prefilledConsumerId = firstParam(routeParams.consumerId);
  const prefilledConsumerName = firstParam(routeParams.consumerName);

  const [consumerId, setConsumerId] = useState(prefilledConsumerId);
  const [consumerName, setConsumerName] = useState(prefilledConsumerName);
  const [area, setArea] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "">("");
  const [category, setCategory] = useState<CaseCategory | "">("");
  const [description, setDescription] = useState("");
  const [inspector, setInspector] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/src/Admin/CasesScreen" as any);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], // MediaTypeOptions deprecated hai (Expo SDK 52+)
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const picked: UploadedFile[] = result.assets.map((a, i) => ({
          uri: a.uri,
          name: a.fileName || `image_${Date.now()}_${i}.jpg`,
          type: "image",
          mimeType: a.mimeType || "image/jpeg",
        }));
        setFiles((prev) => [...prev, ...picked]);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not pick image.");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled) {
        const picked: UploadedFile[] = result.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          type: "document",
          mimeType: a.mimeType || "application/octet-stream",
        }));
        setFiles((prev) => [...prev, ...picked]);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not pick document.");
    }
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (submitting) return;

    if (
      !consumerId.trim() ||
      !consumerName.trim() ||
      !area.trim() ||
      !riskLevel ||
      !category ||
      !description.trim() ||
      !priority
    ) {
      Alert.alert(S.missingFieldsTitle, S.missingFieldsMsg);
      return;
    }

    setSubmitting(true);
    try {
      // Ek hi backend call: case Firestore mein banta hai, evidence upload hoti hai,
      // aur consumer ko notification chala jata hai — sab automatically.
      const res = (await createCase({
        consumerId: consumerId.trim(),
        consumerName: consumerName.trim(),
        area: area.trim(),
        riskLevel,
        category,
        description: description.trim(),
        inspector: inspector.trim() || undefined,
        priority,
        files,
      })) as { caseNumber?: string } | undefined;

      Alert.alert(S.successTitle, S.successMsg(res?.caseNumber ?? ""), [
        { text: "OK", onPress: goBack },
      ]);
    } catch (err: any) {
      Alert.alert(S.errorTitle, S.errorMsg(err?.message ?? String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors?.background ?? Colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={[styles.header, { backgroundColor: colors?.card ?? Colors.white }]}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors?.text ?? Colors.text }]}>
              {S.title}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors?.text ?? Colors.text }]}>
                {S.consumerId}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={S.ph_consumerId}
                placeholderTextColor={Colors.textSecondary}
                value={consumerId}
                onChangeText={setConsumerId}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors?.text ?? Colors.text }]}>
                {S.consumerName}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={S.ph_consumerName}
                placeholderTextColor={Colors.textSecondary}
                value={consumerName}
                onChangeText={setConsumerName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors?.text ?? Colors.text }]}>
                {S.areaLocation}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={S.ph_area}
                placeholderTextColor={Colors.textSecondary}
                value={area}
                onChangeText={setArea}
              />
            </View>

            <Dropdown
              label={S.riskLevel}
              options={RISK_LEVELS}
              value={riskLevel}
              onChange={setRiskLevel}
              placeholder={S.selectRisk}
            />
            <Dropdown
              label={S.caseCategory}
              options={CASE_CATEGORIES}
              value={category}
              onChange={setCategory}
              placeholder={S.selectCategory}
            />

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors?.text ?? Colors.text }]}>
                {S.description}
              </Text>
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

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors?.text ?? Colors.text }]}>
                {S.assignInspectorOptional}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={S.ph_inspector}
                placeholderTextColor={Colors.textSecondary}
                value={inspector}
                onChangeText={setInspector}
              />
            </View>

            <Dropdown
              label={S.priorityLevel}
              options={PRIORITIES}
              value={priority}
              onChange={setPriority}
              placeholder={S.selectPriority}
            />

            <View style={styles.uploadSection}>
              <Text style={[styles.label, { color: colors?.text ?? Colors.text }]}>
                {S.evidenceUpload}
              </Text>
              <View style={styles.uploadBtnRow}>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
                  <Text style={styles.uploadBtnIcon}>🖼</Text>
                  <Text style={styles.uploadBtnText}>{S.uploadImage}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadBtn, styles.uploadBtnDoc]}
                  onPress={pickDocument}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uploadBtnIcon}>📄</Text>
                  <Text style={[styles.uploadBtnText, { color: Colors.primary }]}>
                    {S.uploadDocument}
                  </Text>
                </TouchableOpacity>
              </View>

              {files.length > 0 && (
                <View style={styles.fileList}>
                  {files.map((f, i) => (
                    <View key={`${f.uri}-${i}`} style={styles.fileItem}>
                      <Text style={styles.fileIcon}>{f.type === "image" ? "🖼" : "📄"}</Text>
                      <Text
                        style={[styles.fileName, { color: colors?.text ?? Colors.text }]}
                        numberOfLines={1}
                      >
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

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.submitLoading}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.submitBtnText}>{S.creating}</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>{S.createCase}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={goBack} disabled={submitting}>
              <Text style={[styles.cancelBtnText, { color: colors?.subText ?? Colors.textSecondary }]}>
                {S.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    padding: 16,
    margin: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  form: { paddingHorizontal: 16, paddingTop: 4 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: { height: 110, paddingTop: 12 },
  uploadSection: { marginBottom: 20 },
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
  uploadBtnDoc: {
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  uploadBtnIcon: { fontSize: 16 },
  uploadBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  fileList: { marginTop: 12, gap: 8 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
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
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
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