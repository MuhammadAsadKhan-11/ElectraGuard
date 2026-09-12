import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
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

// Firebase imports
import { onValue, ref } from "firebase/database";
import { rtdb as db } from "../../../firebaseConfig"; // your firebase config file

interface Props {
  navigation: any;
}

type StatusFilter = "All" | "Open" | "In Progress" | "Closed" | "Rejected";

// ─── Status Overview ─────────────────────────────────────────────────────────
const StatusOverview = ({
  cases,
  onFilter,
  activeFilter,
}: {
  cases: Case[];
  onFilter: (s: StatusFilter) => void;
  activeFilter: StatusFilter;
}) => {
  const counts = {
    Open: cases.filter((c) => c.status === "Open").length,
    "In Progress": cases.filter((c) => c.status === "In Progress").length,
    Closed: cases.filter((c) => c.status === "Closed").length,
    Rejected: cases.filter((c) => c.status === "Rejected").length,
  };

  const total = cases.length || 1;

  const items = [
    {
      label: "Open Cases",
      key: "Open" as StatusFilter,
      count: counts.Open,
      color: Colors.warning,
    },
    {
      label: "In Progress",
      key: "In Progress" as StatusFilter,
      count: counts["In Progress"],
      color: Colors.primary,
    },
    {
      label: "Closed",
      key: "Closed" as StatusFilter,
      count: counts.Closed,
      color: Colors.success,
    },
    {
      label: "Rejected",
      key: "Rejected" as StatusFilter,
      count: counts.Rejected,
      color: Colors.danger,
    },
  ];

  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <Text style={styles.overviewTitle}>Case Status Overview</Text>
        <Text style={styles.overviewSub}>
          Total {cases.length} active cases
        </Text>
      </View>
      {items.map((item) => {
        const pct = Math.round((item.count / total) * 100);
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.overviewRow}
            onPress={() =>
              onFilter(activeFilter === item.key ? "All" : item.key)
            }
          >
            <View style={[styles.statusDot, { backgroundColor: item.color }]} />
            <Text style={styles.overviewLabel}>{item.label}</Text>
            <View style={styles.overviewBar}>
              <View
                style={[
                  styles.overviewFill,
                  { width: `${pct}%` as any, backgroundColor: item.color },
                ]}
              />
            </View>
            <Text style={[styles.overviewCount, { color: item.color }]}>
              {item.count}
              <Text style={styles.overviewSuffix}> ({pct}%)</Text>
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Case Card ────────────────────────────────────────────────────────────────
const CaseCard = ({
  caseItem,
  onPress,
}: {
  caseItem: Case;
  onPress: () => void;
}) => {
  const statusColor = getCaseStatusColor(caseItem.status);
  const riskColor = getRiskColor(caseItem.riskLevel);

  return (
    <TouchableOpacity
      style={styles.caseCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.caseCardHeader}>
        <View style={styles.caseIdRow}>
          <Text style={styles.caseNumber}>{caseItem.caseNumber}</Text>
          <View
            style={[styles.riskBadge, { backgroundColor: riskColor + "18" }]}
          >
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>
              {caseItem.riskLevel}
            </Text>
          </View>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}
        >
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {caseItem.status}
          </Text>
        </View>
      </View>
      <Text style={styles.caseName}>{caseItem.consumerName}</Text>
      <Text style={styles.caseDesc} numberOfLines={2}>
        {caseItem.description}
      </Text>
      <View style={styles.caseMetaRow}>
        <Text style={styles.caseMeta}>📍 {caseItem.area}</Text>
        <Text style={styles.caseMeta}>📅 {caseItem.createdAt}</Text>
      </View>
      <View style={styles.caseFooter}>
        {caseItem.inspector ? (
          <Text style={styles.caseInspector}>👤 {caseItem.inspector}</Text>
        ) : (
          <Text style={[styles.caseInspector, { color: Colors.warning }]}>
            ⚠ Unassigned
          </Text>
        )}
        <Text style={styles.evidenceCount}>
          🖼 {caseItem.evidences} evidence{caseItem.evidences !== 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={styles.caseArrow}>›</Text>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CasesScreen({ navigation }: Props) {
  const { colors } = useAppSettings();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Real-time Firebase listener ──
  useEffect(() => {
    const casesRef = ref(db, "cases");
    const unsubscribe = onValue(casesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: Case[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        // newest first
        parsed.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setCases(parsed);
      } else {
        setCases([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = cases.filter((c) =>
    statusFilter === "All" ? true : c.status === statusFilter,
  );

  const tabFilters: StatusFilter[] = ["Open", "In Progress", "Closed"];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Case Management</Text>
            <Text style={styles.headerSub}>
              Track and manage theft investigation cases
            </Text>
          </View>

          {/* + Button — opens CreateCase */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("CreateCase")}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading cases…</Text>
          </View>
        ) : (
          <>
            {/* Status Overview */}
            <StatusOverview
              cases={cases}
              onFilter={setStatusFilter}
              activeFilter={statusFilter}
            />

            {/* Tab Filters */}
            <View style={styles.tabRow}>
              {tabFilters.map((f) => {
                const cnt = cases.filter((c) => c.status === f).length;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.tabBtn,
                      statusFilter === f && styles.tabBtnActive,
                    ]}
                    onPress={() =>
                      setStatusFilter(statusFilter === f ? "All" : f)
                    }
                  >
                    <Text
                      style={[
                        styles.tabText,
                        statusFilter === f && styles.tabTextActive,
                      ]}
                    >
                      {f} ({cnt})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Case List */}
            <View style={styles.listContainer}>
              {filtered.map((c) => (
                <CaseCard
                  key={c.id}
                  caseItem={c}
                  onPress={() =>
                    navigation.navigate("CaseProfile", { caseId: c.id })
                  }
                />
              ))}
              {filtered.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📂</Text>
                  <Text style={styles.emptyText}>No cases found</Text>
                  <Text style={styles.emptySub}>
                    Tap + to create a new case
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    padding: 20,
    margin: 16,
    borderRadius: 16,
    marginTop: 40,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  // + Add Button
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    fontSize: 24,
    color: "#fff",
    lineHeight: 30,
    fontWeight: "500",
  },

  // Loading
  loadingBox: { alignItems: "center", padding: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },

  // Overview
  overviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  overviewHeader: { marginBottom: 14 },
  overviewTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  overviewSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  overviewLabel: { fontSize: 13, color: Colors.text, width: 90 },
  overviewBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  overviewFill: { height: "100%", borderRadius: 3 },
  overviewCount: {
    fontSize: 14,
    fontWeight: "700",
    width: 60,
    textAlign: "right",
  },
  overviewSuffix: {
    fontSize: 10,
    fontWeight: "400",
    color: Colors.textSecondary,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  // List
  listContainer: { paddingHorizontal: 16, gap: 12 },

  // Case Card
  caseCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  caseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  caseIdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  caseNumber: { fontSize: 15, fontWeight: "700", color: Colors.text },
  riskBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  riskBadgeText: { fontSize: 11, fontWeight: "600" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  caseName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  caseDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  caseMetaRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  caseMeta: { fontSize: 11, color: Colors.textSecondary },
  caseFooter: { flexDirection: "row", justifyContent: "space-between" },
  caseInspector: { fontSize: 12, color: Colors.textSecondary },
  evidenceCount: { fontSize: 12, color: Colors.textSecondary },
  caseArrow: {
    position: "absolute",
    right: 16,
    top: "50%",
    fontSize: 20,
    color: Colors.textSecondary,
  },

  // Empty
  emptyState: { padding: 50, alignItems: "center", gap: 6 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary },
});
