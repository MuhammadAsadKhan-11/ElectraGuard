import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Colors,
  getCaseStatusColor,
  getRiskColor,
} from "../../../constants/Colors";
import { Case } from "../../../types";
import { useAppSettings } from "../../../hooks/AppSettingContext";

// Firebase
import { onValue, push, ref, update } from "firebase/database";
import { mockInspectors } from "../../../data/mockData"; // or fetch from Firebase
import { rtdb as db } from "../../../firebaseConfig";

interface Props {
  navigation: any;
  route: { params: { caseId: string } };
}

export default function CaseProfileScreen({ navigation, route }: Props) {
  const { colors } = useAppSettings();
  const { caseId } = route.params;
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(false);
  const [assignedInspector, setAssignedInspector] = useState("");

  // ── Real-time listener for this case ──
  useEffect(() => {
    const caseRef = ref(db, `cases/${caseId}`);
    const unsubscribe = onValue(caseRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCaseItem({ id: caseId, ...data });
        setAssignedInspector(data.inspector || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [caseId]);

  // ── Assign Inspector ──
  const handleAssign = async (inspectorName: string) => {
    if (!caseItem) return;
    try {
      const now = new Date();
      await update(ref(db, `cases/${caseId}`), {
        inspector: inspectorName,
        status: "In Progress",
      });
      // Add timeline entry
      await push(ref(db, `cases/${caseId}/timeline`), {
        action: `Case assigned to ${inspectorName}`,
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5),
      });
      setAssignedInspector(inspectorName);
      setAssignModal(false);
      Alert.alert("✅ Assigned", `Case assigned to ${inspectorName}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  // ── Close Case ──
  const handleClose = () => {
    Alert.alert("Close Case", "Are you sure you want to close this case?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close",
        style: "destructive",
        onPress: async () => {
          try {
            const now = new Date();
            await update(ref(db, `cases/${caseId}`), { status: "Closed" });
            await push(ref(db, `cases/${caseId}/timeline`), {
              action: "Case closed",
              date: now.toISOString().split("T")[0],
              time: now.toTimeString().slice(0, 5),
            });
            navigation.goBack();
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  // ── Escalate ──
  const handleEscalate = async () => {
    try {
      const now = new Date();
      await update(ref(db, `cases/${caseId}`), {
        riskLevel: "Critical",
        priority: "Urgent",
      });
      await push(ref(db, `cases/${caseId}/timeline`), {
        action: "Case escalated to department head",
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5),
      });
      Alert.alert(
        "⬆ Escalated",
        "Case has been escalated to the department head.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading case…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!caseItem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Case not found.</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: Colors.primary, fontWeight: "600" }}>
              ← Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getCaseStatusColor(caseItem.status);
  const riskColor = getRiskColor(caseItem.riskLevel);

  // Timeline as array (Firebase may store it as object)
  const timeline = caseItem.timeline
    ? Array.isArray(caseItem.timeline)
      ? caseItem.timeline
      : Object.values(caseItem.timeline as Record<string, any>)
    : [];

  // Evidence images as array
  const evidenceImages = caseItem.evidenceImages
    ? Array.isArray(caseItem.evidenceImages)
      ? caseItem.evidenceImages
      : Object.values(caseItem.evidenceImages as Record<string, any>)
    : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Inspector Assign Modal */}
      <Modal visible={assignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Inspector</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {mockInspectors.map((ins) => (
              <TouchableOpacity
                key={ins.id}
                style={styles.inspectorRow}
                onPress={() => ins.available && handleAssign(ins.name)}
                activeOpacity={ins.available ? 0.75 : 1}
              >
                <View style={styles.inspectorInfo}>
                  <Text style={styles.inspectorIcon}>👤</Text>
                  <View>
                    <Text style={styles.inspectorName}>{ins.name}</Text>
                    <Text style={styles.inspectorArea}>{ins.area}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.assignBtn,
                    {
                      backgroundColor:
                        assignedInspector === ins.name
                          ? Colors.success
                          : ins.available
                            ? Colors.primary
                            : Colors.border,
                    },
                  ]}
                >
                  <Text style={styles.assignBtnText}>
                    {assignedInspector === ins.name
                      ? "Assigned"
                      : ins.available
                        ? "Assign"
                        : "Busy"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.caseNumber}>{caseItem.caseNumber}</Text>
            <Text style={styles.caseName}>
              {caseItem.consumerName} •{" "}
              {caseItem.meterNumber || caseItem.consumerId}
            </Text>
          </View>
          <View style={styles.headerBadges}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusColor + "20",
                  borderColor: statusColor,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {caseItem.status}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: riskColor + "15", marginTop: 4 },
              ]}
            >
              <Text style={[styles.badgeText, { color: riskColor }]}>
                {caseItem.riskLevel}
              </Text>
            </View>
          </View>
        </View>

        {/* Case Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case Details</Text>
          <Text style={styles.caseDesc}>{caseItem.description}</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailLabel}>Area</Text>
              <Text style={styles.detailValue}>{caseItem.area}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{caseItem.createdAt}</Text>
            </View>
            {caseItem.category && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏷</Text>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{caseItem.category}</Text>
              </View>
            )}
            {caseItem.priority && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⚡</Text>
                <Text style={styles.detailLabel}>Priority</Text>
                <Text style={styles.detailValue}>{caseItem.priority}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case Timeline</Text>
          {timeline.length === 0 ? (
            <Text style={styles.noEvidence}>No timeline events yet</Text>
          ) : (
            timeline.map((t: any, i: number) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineDotCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor:
                          i === 0 ? Colors.primary : Colors.border,
                      },
                    ]}
                  />
                  {i < timeline.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineAction}>{t.action}</Text>
                  <Text style={styles.timelineDate}>
                    {t.date} {t.time}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Evidence */}
        <View style={styles.card}>
          <View style={styles.evidenceHeader}>
            <Text style={styles.cardTitle}>
              Evidence ({evidenceImages.length})
            </Text>
            <TouchableOpacity style={styles.uploadBtn}>
              <Text style={styles.uploadBtnText}>⬆ Upload</Text>
            </TouchableOpacity>
          </View>
          {evidenceImages.length === 0 ? (
            <Text style={styles.noEvidence}>No evidence uploaded yet</Text>
          ) : (
            evidenceImages.map((img: any, i: number) => (
              <View key={i} style={styles.evidenceItem}>
                <View style={styles.evidenceIconBox}>
                  <Text style={styles.evidenceIcon}>
                    {img.type === "image" ? "🖼" : "📄"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.evidenceName} numberOfLines={1}>
                    {img.name}
                  </Text>
                  <Text style={styles.evidenceMeta}>
                    {img.uploadedBy || "Admin"} •{" "}
                    {img.date || caseItem.createdAt}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Assign Inspector */}
        <View style={styles.card}>
          <View style={styles.assignHeader}>
            <Text style={styles.cardTitle}>Assign Inspector</Text>
            <TouchableOpacity
              style={styles.assignModalBtn}
              onPress={() => setAssignModal(true)}
            >
              <Text style={styles.assignModalBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
          {mockInspectors.map((ins) => (
            <View key={ins.id} style={styles.inspectorRow}>
              <View style={styles.inspectorInfo}>
                <Text style={styles.inspectorIcon}>👤</Text>
                <View>
                  <Text style={styles.inspectorName}>{ins.name}</Text>
                  <Text style={styles.inspectorArea}>{ins.area}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.assignBtn,
                  {
                    backgroundColor:
                      assignedInspector === ins.name
                        ? Colors.success
                        : ins.available
                          ? Colors.primary
                          : Colors.border,
                  },
                ]}
                onPress={() => ins.available && handleAssign(ins.name)}
              >
                <Text style={styles.assignBtnText}>
                  {assignedInspector === ins.name
                    ? "Assigned"
                    : ins.available
                      ? "Assign"
                      : "Busy"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.success }]}
            onPress={handleClose}
          >
            <Text style={styles.actionBtnText}>✓ Close Case</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.danger }]}
            onPress={handleEscalate}
          >
            <Text style={styles.actionBtnText}>⬆ Escalate</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  caseDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  detailItem: { minWidth: "45%" },
  detailIcon: { fontSize: 16, marginBottom: 4 },
  detailLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "600", color: Colors.text },

  timelineRow: { flexDirection: "row", marginBottom: 4 },
  timelineDotCol: { alignItems: "center", width: 24, marginRight: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineAction: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
    lineHeight: 18,
  },
  timelineDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  evidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  uploadBtn: {
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadBtnText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  noEvidence: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    padding: 16,
  },
  evidenceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
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

  assignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  assignModalBtn: {
    backgroundColor: Colors.primary + "15",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  assignModalBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },

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

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "flex-end",
  },
  assignModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textSecondary },
});
