import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Firebase imports — adjust the path to match your project setup
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig"; // <-- update this path
import { useAppSettings } from "../../../hooks/AppSettingContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseSummary {
  caseId: string;
  consumerId: string;
  currentStatus: string;
  riskLevel: "High" | "Medium" | "Low";
  assignedInspector: string;
}

interface DropdownOption {
  label: string;
  value: string;
}

interface UploadedFile {
  uri: string;
  name: string;
  type: "image" | "document";
  mimeType?: string;
}

// ─── Dropdown Component ───────────────────────────────────────────────────────

const Dropdown: React.FC<{
  placeholder: string;
  options: DropdownOption[];
  selected: string;
  onSelect: (value: string) => void;
}> = ({ placeholder, options, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === selected)?.label;

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.dropdownTriggerText,
            !selectedLabel && styles.dropdownPlaceholder,
          ]}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#64748B"
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                opt.value === selected && styles.dropdownItemSelected,
              ]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  opt.value === selected && styles.dropdownItemTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Risk Badge ───────────────────────────────────────────────────────────────

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const color =
    level === "High" ? "#EF4444" : level === "Medium" ? "#F97316" : "#22C55E";
  const bg =
    level === "High" ? "#FEE2E2" : level === "Medium" ? "#FFEDD5" : "#DCFCE7";

  return (
    <View style={[styles.riskBadge, { backgroundColor: bg }]}>
      {/* Risk icon — replace with your own image using <Image source={require('../assets/risk-icon.png')} /> */}
      <Ionicons name="warning" size={12} color={color} />
      <Text style={[styles.riskBadgeText, { color }]}>{level}</Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EscalateCaseScreen() {
  const { colors } = useAppSettings();
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();

  // Case summary
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [loadingCase, setLoadingCase] = useState(true);

  // Escalation options from Firebase
  const [escalationLevels, setEscalationLevels] = useState<DropdownOption[]>(
    [],
  );
  const [escalationReasons, setEscalationReasons] = useState<DropdownOption[]>(
    [],
  );

  // Form state
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch case summary ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const id = caseId ?? "CASE003"; // fallback for dev
        const snap = await getDoc(doc(db, "cases", id));
        if (snap.exists()) {
          setCaseSummary(snap.data() as CaseSummary);
        }
      } catch (e) {
        console.error("Failed to fetch case:", e);
      } finally {
        setLoadingCase(false);
      }
    };
    fetchCase();
  }, [caseId]);

  // ── Fetch escalation options ────────────────────────────────────────────────
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const levelsSnap = await getDocs(collection(db, "escalation_levels"));
        setEscalationLevels(
          levelsSnap.docs.map((d) => ({
            label: d.data().label as string,
            value: d.id,
          })),
        );

        const reasonsSnap = await getDocs(collection(db, "escalation_reasons"));
        setEscalationReasons(
          reasonsSnap.docs.map((d) => ({
            label: d.data().label as string,
            value: d.id,
          })),
        );
      } catch (e) {
        console.error("Failed to fetch escalation options:", e);
      }
    };
    fetchOptions();
  }, []);

  // ── Image picker ────────────────────────────────────────────────────────────
  const handleUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploadedFiles((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName ?? `image_${Date.now()}.jpg`,
          type: "image",
          mimeType: asset.mimeType ?? "image/jpeg",
        },
      ]);
    }
  };

  // ── Document picker ─────────────────────────────────────────────────────────
  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadedFiles((prev) => [
          ...prev,
          {
            uri: asset.uri,
            name: asset.name,
            type: "document",
            mimeType: asset.mimeType ?? "application/octet-stream",
          },
        ]);
      }
    } catch {
      // ← remove (e)
      Alert.alert("Error", "Could not pick document.");
    }
  };

  // ── Remove file ─────────────────────────────────────────────────────────────
  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Upload a single file to Firebase Storage ────────────────────────────────
  const uploadFileToStorage = async (
    file: UploadedFile,
    caseDocId: string,
  ): Promise<string> => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const fileRef = ref(
      storage,
      `escalations/${caseDocId}/${Date.now()}_${file.name}`,
    );
    await uploadBytes(fileRef, blob, { contentType: file.mimeType });
    return await getDownloadURL(fileRef);
  };

  // ── Confirm escalation ──────────────────────────────────────────────────────
  const handleConfirmEscalation = async () => {
    if (!selectedLevel) {
      Alert.alert("Required", "Please select an escalation level.");
      return;
    }
    if (!selectedReason) {
      Alert.alert("Required", "Please select a reason for escalation.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required", "Please provide a description.");
      return;
    }

    setSubmitting(true);
    try {
      const id = caseId ?? "CASE003";

      // Upload files
      const fileUrls: string[] = [];
      for (const file of uploadedFiles) {
        const url = await uploadFileToStorage(file, id);
        fileUrls.push(url);
      }

      // Update Firestore document
      await updateDoc(doc(db, "cases", id), {
        escalated: true,
        escalationLevel: selectedLevel,
        escalationReason: selectedReason,
        escalationDescription: description.trim(),
        escalationFiles: fileUrls,
        escalationTimestamp: serverTimestamp(),
        currentStatus: "Escalated",
      });

      Alert.alert(
        "Case Escalated",
        "The case has been successfully escalated.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      console.error("Escalation failed:", e);
      Alert.alert("Error", "Failed to escalate case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    router.back();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {/* Replace the Ionicons below with your custom back icon image:
              <Image source={require('../assets/back-arrow.png')} style={styles.backIcon} /> */}
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escalate Case</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Case Summary ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Case Summary</Text>
            <Text style={styles.cardSubtitle}>
              Review case details before escalation
            </Text>
          </View>

          {loadingCase ? (
            <ActivityIndicator color="#E63946" style={{ marginVertical: 16 }} />
          ) : caseSummary ? (
            <View style={styles.summaryTable}>
              <SummaryRow label="Case ID" value={caseSummary.caseId} />
              <SummaryRow label="Consumer ID" value={caseSummary.consumerId} />
              <SummaryRow
                label="Current Status"
                value={caseSummary.currentStatus}
              />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Risk Level</Text>
                <RiskBadge level={caseSummary.riskLevel} />
              </View>
              <SummaryRow
                label="Assigned Inspector"
                value={caseSummary.assignedInspector}
                last
              />
            </View>
          ) : (
            <Text style={styles.errorText}>Could not load case details.</Text>
          )}
        </View>

        {/* ── Escalation Details ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Escalation Details</Text>
            <Text style={styles.cardSubtitle}>
              Provide escalation justification
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Escalation Level<Text style={styles.required}> *</Text>
            </Text>
            <Dropdown
              placeholder="Select escalation level"
              options={escalationLevels}
              selected={selectedLevel}
              onSelect={setSelectedLevel}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Reason for Escalation<Text style={styles.required}> *</Text>
            </Text>
            <Dropdown
              placeholder="Select reason"
              options={escalationReasons}
              selected={selectedReason}
              onSelect={setSelectedReason}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Description<Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Provide comprehensive detail for escalation. Include specific details, evidence, and impact assessment."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Upload Buttons */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Attach Additional Evidence{" "}
              <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <View style={styles.uploadRow}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadImage}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={16} color="#E63946" />
                <Text style={styles.uploadButtonText}>Upload Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadDocument}
                activeOpacity={0.8}
              >
                <Ionicons name="document-outline" size={16} color="#E63946" />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </TouchableOpacity>
            </View>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <View style={styles.fileList}>
                {uploadedFiles.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <Ionicons
                      name={
                        file.type === "image"
                          ? "image-outline"
                          : "document-outline"
                      }
                      size={16}
                      color="#64748B"
                    />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeFile(index)}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Important Notice ── */}
        <View style={styles.noticeCard}>
          <Ionicons name="warning-outline" size={18} color="#D97706" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.noticeTitle}>Important Notice</Text>
            <Text style={styles.noticeText}>
              Escalated cases will be reviewed by higher authority and cannot be
              reversed.
            </Text>
          </View>
        </View>

        {/* ── Buttons ── */}
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.buttonDisabled]}
          onPress={handleConfirmEscalation}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Escalation</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Helper: Summary Row ──────────────────────────────────────────────────────

const SummaryRow: React.FC<{
  label: string;
  value: string;
  last?: boolean;
}> = ({ label, value, last }) => (
  <View style={[styles.summaryRow, last && { borderBottomWidth: 0 }]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 0.2,
  },

  scrollContent: {
    padding: 16,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
  },

  // Summary table
  summaryTable: {
    gap: 0,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 8,
  },

  // Risk badge
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Form fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#E63946",
  },
  optional: {
    color: "#94A3B8",
    fontWeight: "400",
  },

  // Dropdown
  dropdownWrapper: {
    position: "relative",
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FAFAFA",
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: "#1E293B",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: "#94A3B8",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 4,
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dropdownItemSelected: {
    backgroundColor: "#FFF1F2",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#334155",
  },
  dropdownItemTextSelected: {
    color: "#E63946",
    fontWeight: "600",
  },

  // Text area
  textArea: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    color: "#1E293B",
    backgroundColor: "#FAFAFA",
    minHeight: 110,
    lineHeight: 20,
  },

  // Upload
  uploadRow: {
    flexDirection: "row",
    gap: 10,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#E63946",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFF1F2",
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E63946",
  },
  fileList: {
    marginTop: 10,
    gap: 6,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
  },

  // Notice
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 3,
  },
  noticeText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
  },

  // Buttons
  confirmButton: {
    backgroundColor: "#E63946",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#E63946",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },

  errorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
  },
});
