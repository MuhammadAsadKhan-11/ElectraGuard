// app/src/Admin/CasesScreen.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, getCaseStatusColor, getRiskColor } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import { CaseSummaryDTO, CaseStatus, useCasesList } from "../../../hooks/useCasesApi";

type StatusFilter = CaseStatus | "All";
type AppColors = ReturnType<typeof useAppSettings>["colors"];
type CaseStrings = ReturnType<typeof getStrings>["cases"];

const EMPTY_COUNTS = {
  Open: 0,
  "In Progress": 0,
  Closed: 0,
  Rejected: 0,
} as Record<CaseStatus, number>;

// ─── Status Overview (live counts from server) ─────────────────
const StatusOverview = ({
  counts,
  total,
  onFilter,
  activeFilter,
  colors,
  S, // FIX: S was declared in the type but never destructured
}: {
  counts: Record<CaseStatus, number>;
  total: number;
  onFilter: (s: StatusFilter) => void;
  activeFilter: StatusFilter;
  colors: AppColors;
  S: CaseStrings;
}) => {
  const denom = total || 1;

  const items: { label: string; key: StatusFilter; count: number; color: string }[] = [
    { label: S.statusOpen, key: "Open", count: counts.Open ?? 0, color: Colors.warning },
    { label: S.statusInProgress, key: "In Progress", count: counts["In Progress"] ?? 0, color: Colors.primary },
    { label: S.statusClosed, key: "Closed", count: counts.Closed ?? 0, color: Colors.success },
    { label: S.statusRejected, key: "Rejected", count: counts.Rejected ?? 0, color: Colors.danger },
  ];

  return (
    <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
      <View style={styles.overviewHeader}>
        <Text style={[styles.overviewTitle, { color: colors.text }]}>{S.overviewTitle}</Text>
        <Text style={[styles.overviewSub, { color: colors.subText }]}>{S.totalActive(total)}</Text>
      </View>
      {items.map((item) => {
        const pct = Math.round((item.count / denom) * 100);
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.overviewRow}
            onPress={() => onFilter(activeFilter === item.key ? "All" : item.key)}
          >
            <View style={[styles.statusDot, { backgroundColor: item.color }]} />
            <Text style={[styles.overviewLabel, { color: colors.text }]}>{item.label}</Text>
            <View style={[styles.overviewBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.overviewFill,
                  { width: `${pct}%` as any, backgroundColor: item.color },
                ]}
              />
            </View>
            <Text style={[styles.overviewCount, { color: item.color }]}>
              {item.count}
              <Text style={[styles.overviewSuffix, { color: colors.subText }]}> ({pct}%)</Text>
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Case Card ────────────────────────────────────────────────
const CaseCard = ({
  caseItem,
  onPress,
  colors,
  S, // FIX: S was declared in the type but never destructured
}: {
  caseItem: CaseSummaryDTO;
  onPress: () => void;
  colors: AppColors;
  S: CaseStrings;
}) => {
  // FIX: fallback colors so a bad/unknown value from the backend can't crash the list
  const statusColor = getCaseStatusColor(caseItem.status) ?? Colors.primary;
  const riskColor = getRiskColor(caseItem.riskLevel) ?? Colors.warning;

  return (
    <TouchableOpacity
      style={[styles.caseCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.caseCardHeader}>
        <View style={styles.caseIdRow}>
          <Text style={[styles.caseNumber, { color: colors.text }]}>{caseItem.caseNumber}</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor + "18" }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>{caseItem.riskLevel}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{caseItem.status}</Text>
        </View>
      </View>
      <Text style={[styles.caseName, { color: colors.text }]}>{caseItem.consumerName}</Text>
      <Text style={[styles.caseDesc, { color: colors.subText }]} numberOfLines={2}>
        {caseItem.description}
      </Text>
      <View style={styles.caseMetaRow}>
        <Text style={[styles.caseMeta, { color: colors.subText }]}>📍 {caseItem.area}</Text>
        <Text style={[styles.caseMeta, { color: colors.subText }]}>📅 {caseItem.createdAt}</Text>
      </View>
      <View style={styles.caseFooter}>
        {caseItem.inspector ? (
          <Text style={[styles.caseInspector, { color: colors.subText }]}>👤 {caseItem.inspector}</Text>
        ) : (
          <Text style={[styles.caseInspector, { color: Colors.warning }]}>⚠ {S.unassigned}</Text>
        )}
        <Text style={[styles.evidenceCount, { color: colors.subText }]}>
          🖼 {S.evidenceCount(caseItem.evidences)}
        </Text>
      </View>
      <Text style={[styles.caseArrow, { color: colors.subText }]}>›</Text>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────
export default function CasesScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).cases;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const {
    cases: rawCases,
    counts: rawCounts,
    total: rawTotal,
    loading,
    refreshing,
    pullRefresh,
  } = useCasesList(statusFilter);

  // FIX: safe defaults in case the API fails or returns nothing
  const cases: CaseSummaryDTO[] = rawCases ?? [];
  const counts: Record<CaseStatus, number> = rawCounts ?? EMPTY_COUNTS;
  const total: number = rawTotal ?? 0;

  const tabFilters: CaseStatus[] = ["Open", "In Progress", "Closed"];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={pullRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{S.title}</Text>
            <Text style={[styles.headerSub, { color: colors.subText }]}>{S.subtitle}</Text>
          </View>

          {/* + Button — opens Create Case */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/src/Admin/createCaseScreen" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subText }]}>{S.loading}</Text>
          </View>
        ) : (
          <>
            <StatusOverview
              counts={counts}
              total={total}
              onFilter={setStatusFilter}
              activeFilter={statusFilter}
              colors={colors}
              S={S}
            />

            {/* Tab Filters */}
            <View style={styles.tabRow}>
              {tabFilters.map((f) => {
                const cnt = counts[f] ?? 0;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.tabBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      statusFilter === f && styles.tabBtnActive,
                    ]}
                    onPress={() => setStatusFilter(statusFilter === f ? "All" : f)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: colors.subText },
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
              {cases.map((c) => (
                <CaseCard
                  key={c.id}
                  caseItem={c}
                  colors={colors}
                  S={S}
                  onPress={() =>
                    router.push({
                      pathname: "/src/Admin/CaseProfileScreen",
                      params: { caseId: c.id },
                    } as any)
                  }
                />
              ))}
              {cases.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📂</Text>
                  <Text style={[styles.emptyText, { color: colors.text }]}>{S.emptyTitle}</Text>
                  <Text style={[styles.emptySub, { color: colors.subText }]}>{S.emptySub}</Text>
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

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
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
  addBtnText: { fontSize: 24, color: "#fff", lineHeight: 30, fontWeight: "500" },
  loadingBox: { alignItems: "center", padding: 40, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
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
  overviewRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  overviewLabel: { fontSize: 13, color: Colors.text, width: 90 },
  overviewBar: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  overviewFill: { height: "100%", borderRadius: 3 },
  overviewCount: { fontSize: 14, fontWeight: "700", width: 60, textAlign: "right" },
  overviewSuffix: { fontSize: 10, fontWeight: "400", color: Colors.textSecondary },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { paddingHorizontal: 16, gap: 12 },
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
  caseCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  caseIdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  caseNumber: { fontSize: 15, fontWeight: "700", color: Colors.text },
  riskBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  riskBadgeText: { fontSize: 11, fontWeight: "600" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  caseName: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  caseDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  caseMetaRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  caseMeta: { fontSize: 11, color: Colors.textSecondary },
  caseFooter: { flexDirection: "row", justifyContent: "space-between" },
  caseInspector: { fontSize: 12, color: Colors.textSecondary },
  evidenceCount: { fontSize: 12, color: Colors.textSecondary },
  caseArrow: { position: "absolute", right: 16, top: "50%", fontSize: 20, color: Colors.textSecondary },
  emptyState: { padding: 50, alignItems: "center", gap: 6 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary },
});