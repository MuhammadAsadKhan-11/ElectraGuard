import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { IssueType, ReportDisplayItem } from "../../../types/report.types"; // ← imported

// ─── Types ────────────────────────────────────────────────────────
// ✅ IssueType and ReportDisplayItem are now imported from types/report.types.ts

// ✅ fullName matches exactly what RegisterScreen saves
interface ConsumerData {
  uid: string;
  fullName: string;
  consumerId: string;
  email: string;
  mobileNumber?: string;
}

// ─── Main Component ───────────────────────────────────────────────
export default function ReportScreen() {
  const { colors, t } = useAppSettings();
  const [consumer, setConsumer] = useState<ConsumerData | null>(null);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [previousReports, setPreviousReports] = useState<ReportDisplayItem[]>(
    [],
  );

  // Form state
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [description, setDescription] = useState("");
  const [meterLocation, setMeterLocation] = useState("");
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High">("Low");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Loading states
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);

  // ── Auth + fetch consumer using uid (direct doc fetch) ────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // ✅ Fetch document directly by uid — no need to search by email
        const snap = await getDoc(doc(db, "consumers", user.uid));
        if (snap.exists()) {
          const data = snap.data() as ConsumerData;
          setConsumer(data);
          await fetchPreviousReports(data.consumerId);
        }
      } catch (e) {
        console.error("Error fetching consumer:", e);
      }
    });
    return unsub;
  }, []);

  // ── Fetch issue types from Firestore ──────────────────────────
  useEffect(() => {
    const fetchIssueTypes = async () => {
      try {
        const snap = await getDocs(collection(db, "issueTypes"));
        const types: IssueType[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<IssueType, "id">),
        }));
        setIssueTypes(types);
      } catch (e) {
        console.error("Error fetching issue types:", e);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchIssueTypes();
  }, []);

  // ── Fetch previous cases from "cases" collection ──────────────
  const fetchPreviousReports = async (consumerId: string) => {
    try {
      const q = query(
        collection(db, "cases"),
        where("consumerId", "==", consumerId),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const reports: ReportDisplayItem[] = snap.docs.map((d) => ({
        id: d.id,
        referenceId: d.data().caseId,
        issueType: d.data().issueType,
        description: d.data().description,
        meterLocation: d.data().location,
        urgencyLevel: d.data().riskLevel,
        status: d.data().currentStatus,
        resolution: d.data().resolution ?? "",
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        imageUrl: d.data().imageUrl ?? "",
      }));
      setPreviousReports(reports);
    } catch (e) {
      console.error("Error fetching cases:", e);
    } finally {
      setLoadingReports(false);
    }
  };

  // ── Pick Image ─────────────────────────────────────────────────
  const handlePickImage = async () => {
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
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ── Generate reference ID ──────────────────────────────────────
  const generateRefId = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `RPT-${num}`;
  };

  // ── Submit Report → saves to "cases" collection ───────────────
  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert("Required", "Please select an issue type.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required", "Please describe the issue.");
      return;
    }
    if (!meterLocation.trim()) {
      Alert.alert("Required", "Please enter meter location.");
      return;
    }
    if (!consumer) {
      Alert.alert("Error", "Consumer data not loaded. Please restart the app.");
      return;
    }

    setSubmitting(true);
    try {
      const referenceId = generateRefId();

      await addDoc(collection(db, "cases"), {
        caseId: referenceId,
        // ✅ Uses the name the consumer entered at registration
        consumerId: consumer.consumerId,
        consumerName: consumer.fullName,
        consumerEmail: consumer.email,
        issueType: selectedIssue.label,
        issueValue: selectedIssue.value,
        description: description.trim(),
        location: meterLocation.trim(),
        riskLevel: urgency,
        currentStatus: "Under Investigation",
        assignedInspector: "",
        escalated: false,
        imageUrl: selectedImage ?? "",
        resolution: "",
        createdAt: new Date(),
      });

      Alert.alert(
        "Report Submitted ✅",
        `Your reference ID is: ${referenceId}\nWe will contact you within 24–48 hours.`,
      );

      // Reset form
      setSelectedIssue(null);
      setDescription("");
      setMeterLocation("");
      setUrgency("Low");
      setSelectedImage(null);

      // Refresh list
      await fetchPreviousReports(consumer.consumerId);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status color helper ────────────────────────────────────────
  const statusColor = (status: string) => {
    if (status === "Resolved") return { bg: "#DCFCE7", text: "#16A34A" };
    if (status === "In Progress") return { bg: "#FEF9C3", text: "#CA8A04" };
    if (status === "Escalated") return { bg: "#FEE2E2", text: "#DC2626" };
    if (status === "Under Investigation")
      return { bg: "#DBEAFE", text: "#2563EB" };
    return { bg: "#F3F4F6", text: "#6B7280" };
  };

  const urgencyColors = {
    Low: "#2EC4B6",
    Medium: "#F59E0B",
    High: "#EF4444",
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Report Theft</Text>
          <Text style={styles.heroSub}>
            Submit meter issues, billing concerns, or unusual activity
          </Text>
          {/* ✅ Show the logged-in consumer's name */}
          {consumer && (
            <View style={styles.consumerBadge}>
              <Ionicons
                name="person-circle-outline"
                size={16}
                color="#93C5FD"
              />
              <Text style={styles.consumerBadgeText}>
                Reporting as: {consumer.fullName}
              </Text>
            </View>
          )}
        </View>

        {/* ══════════════ SUBMIT FORM ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Submit New Report</Text>

          {/* Issue Type Dropdown */}
          <Text style={styles.fieldLabel}>
            Issue Type <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.8}
          >
            <Text
              style={
                selectedIssue
                  ? styles.dropdownSelected
                  : styles.dropdownPlaceholder
              }
            >
              {selectedIssue ? selectedIssue.label : "Select issue type"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.fieldLabel}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please describe the issue in detail..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Meter Location */}
          <Text style={styles.fieldLabel}>
            Meter Location <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Outside main gate, Blue Area..."
            placeholderTextColor="#9CA3AF"
            value={meterLocation}
            onChangeText={setMeterLocation}
          />

          {/* Urgency Level */}
          <Text style={styles.fieldLabel}>
            Urgency Level <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.urgencyRow}>
            {(["Low", "Medium", "High"] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.urgencyBtn,
                  urgency === level && {
                    backgroundColor: urgencyColors[level],
                    borderColor: urgencyColors[level],
                  },
                ]}
                onPress={() => setUrgency(level)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.urgencyBtnText,
                    urgency === level && { color: "#FFFFFF" },
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upload Photo */}
          <Text style={styles.fieldLabel}>Upload Photo (Optional)</Text>
          <TouchableOpacity
            style={styles.imageUploadBox}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {selectedImage ? (
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                />
                <Text style={styles.imageChangeTxt}>Tap to change</Text>
              </View>
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                <Text style={styles.imageUploadTitle}>
                  Take or upload photo of the issue
                </Text>
                <Text style={styles.imageUploadSub}>Supports JPG, PNG</Text>
                <View style={styles.selectImgBtn}>
                  <Ionicons name="image-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.selectImgBtnText}>Select Image</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* What happens next */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            {[
              "Your report will be reviewed by our technical team",
              "You'll receive a reference ID for tracking",
              "We'll contact you within 24–48 hours",
              "An inspector may be dispatched if needed",
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════ PREVIOUS CASES ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Submitted Cases</Text>

          {loadingReports ? (
            <ActivityIndicator color="#0B3C5D" style={{ marginVertical: 20 }} />
          ) : previousReports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={28} color="#D1D5DB" />
              <Text style={styles.emptyText}>No cases submitted yet</Text>
            </View>
          ) : (
            previousReports.map((report) => {
              const sc = statusColor(report.status);
              return (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportRefId}>{report.referenceId}</Text>
                    <View
                      style={[styles.statusBadge, { backgroundColor: sc.bg }]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: sc.text }]}
                      >
                        {report.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reportIssueType}>{report.issueType}</Text>

                  {report.meterLocation ? (
                    <View style={styles.reportLocationRow}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#9CA3AF"
                      />
                      <Text style={styles.reportLocation}>
                        {report.meterLocation}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.reportBottomRow}>
                    <View style={styles.reportDateRow}>
                      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.reportDate}>
                        {report.createdAt instanceof Date
                          ? report.createdAt.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Just submitted"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.riskPill,
                        {
                          backgroundColor:
                            report.urgencyLevel === "High"
                              ? "#FEE2E2"
                              : report.urgencyLevel === "Medium"
                                ? "#FEF9C3"
                                : "#DCFCE7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.riskPillText,
                          {
                            color:
                              report.urgencyLevel === "High"
                                ? "#DC2626"
                                : report.urgencyLevel === "Medium"
                                  ? "#CA8A04"
                                  : "#16A34A",
                          },
                        ]}
                      >
                        {report.urgencyLevel} Risk
                      </Text>
                    </View>
                  </View>

                  {report.resolution ? (
                    <Text style={styles.reportResolution}>
                      Resolution: {report.resolution}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* ══════════════ CONTACT ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DISCO Contact Information</Text>
          {[
            {
              icon: "call-outline",
              label: "Helpline",
              value: "118",
              action: () => Linking.openURL("tel:118"),
            },
            {
              icon: "mail-outline",
              label: "Email",
              value: "support@electraguard.pk",
              action: () => Linking.openURL("mailto:support@electraguard.pk"),
            },
          ].map(({ icon, label, value, action }) => (
            <TouchableOpacity
              key={label}
              style={styles.contactRow}
              onPress={action}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconBox}>
                <Ionicons name={icon as any} size={20} color="#0B3C5D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{label}</Text>
                <Text style={styles.contactValue}>{value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Issue Type Dropdown Modal ── */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
          activeOpacity={1}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Issue Type</Text>
            {loadingTypes ? (
              <ActivityIndicator
                color="#0B3C5D"
                style={{ marginVertical: 20 }}
              />
            ) : issueTypes.length === 0 ? (
              <Text style={styles.emptyText}>No issue types found.</Text>
            ) : (
              issueTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.modalOption,
                    selectedIssue?.id === type.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedIssue(type);
                    setShowDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedIssue?.id === type.id &&
                        styles.modalOptionTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {selectedIssue?.id === type.id && (
                    <Ionicons name="checkmark" size={18} color="#0B3C5D" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 100 },
  required: { color: "#DC2626" },

  heroCard: {
    backgroundColor: "#0B3C5D",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSub: { fontSize: 13, color: "#93C5FD" },
  consumerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  consumerBadgeText: { fontSize: 12, color: "#BFDBFE", fontWeight: "600" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2933",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#F9FAFB",
  },
  dropdownPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  dropdownSelected: { fontSize: 14, color: "#1F2933", fontWeight: "500" },

  textArea: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#1F2933",
    backgroundColor: "#F9FAFB",
    minHeight: 110,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#1F2933",
    backgroundColor: "#F9FAFB",
  },

  urgencyRow: { flexDirection: "row", gap: 10 },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  urgencyBtnText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },

  imageUploadBox: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 4,
    gap: 6,
    minHeight: 130,
    justifyContent: "center",
  },
  imageUploadTitle: { fontSize: 13, fontWeight: "500", color: "#374151" },
  imageUploadSub: { fontSize: 11, color: "#9CA3AF" },
  selectImgBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0B3C5D",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  selectImgBtnText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  imagePreviewWrapper: { alignItems: "center", gap: 8 },
  imagePreview: { width: 200, height: 140, borderRadius: 10 },
  imageChangeTxt: { fontSize: 12, color: "#9CA3AF" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0B3C5D",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  infoBox: {
    backgroundColor: "#EFF9F8",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B3C5D",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2EC4B6",
    marginTop: 6,
  },
  infoText: { fontSize: 12, color: "#374151", flex: 1 },

  reportCard: {
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reportCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reportRefId: { fontSize: 13, fontWeight: "700", color: "#0B3C5D" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  reportIssueType: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2933",
    marginBottom: 6,
  },
  reportLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  reportLocation: { fontSize: 11, color: "#9CA3AF" },
  reportBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reportDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reportDate: { fontSize: 11, color: "#9CA3AF" },
  riskPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  riskPillText: { fontSize: 10, fontWeight: "600" },
  reportResolution: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    fontStyle: "italic",
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  contactLabel: { fontSize: 11, color: "#9CA3AF" },
  contactValue: { fontSize: 14, fontWeight: "500", color: "#1F2933" },

  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2933",
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: "#EFF6FF" },
  modalOptionText: { fontSize: 14, color: "#374151" },
  modalOptionTextActive: { fontSize: 14, fontWeight: "600", color: "#0B3C5D" },
});
