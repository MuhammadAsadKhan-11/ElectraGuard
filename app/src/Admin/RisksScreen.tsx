// app/src/Admin/RisksScreen.tsx
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import NotificationBell from "../../../components/NotificationBell";
import { formatNumber, palette, riskColor } from "../../../constants/adminUi";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import {
  ConsumerSummary,
  RiskListResponse,
  useApi,
  useLiveRefresh,
} from "../../../hooks/useAdminApi";

type FilterType = "All Risks" | "High Only" | "Medium Only" | "Low Only";

const FILTERS: FilterType[] = ["All Risks", "High Only", "Medium Only", "Low Only"];

const LEVEL_BY_FILTER: Record<FilterType, string> = {
  "All Risks": "all",
  "High Only": "high",
  "Medium Only": "medium",
  "Low Only": "low",
};

// ─── Consumer Card ───────────────────────────────────────────
const ConsumerCard = ({
  consumer,
  onPress,
}: {
  consumer: ConsumerSummary;
  onPress: () => void;
}) => {
  const { colors } = useAppSettings();
  const color = riskColor(consumer.riskLevel);

  return (
    <TouchableOpacity
      style={[styles.consumerCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.nameRow}>
          <Text style={[styles.consumerName, { color: colors.text }]}>
            {consumer.name}
          </Text>
          {consumer.riskLevel === "High" && <Text style={styles.fireIcon}>🔥</Text>}
        </View>
        <View
          style={[
            styles.riskBadge,
            { backgroundColor: color + "18", borderColor: color + "40", borderWidth: 1 },
          ]}
        >
          <Text style={[styles.riskBadgeText, { color }]}>
            {consumer.riskLevel} Risk
          </Text>
        </View>
      </View>

      <Text style={[styles.consumerMeta, { color: colors.subText }]}>
        {[consumer.consumerId, consumer.meterNumber].filter(Boolean).join(" • ")}
      </Text>

      {!!consumer.location && (
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={[styles.locationText, { color: colors.subText }]}>
            {consumer.location}
          </Text>
        </View>
      )}

      <View style={styles.riskScoreRow}>
        <Text style={[styles.riskScoreLabel, { color: colors.subText }]}>Risk Score</Text>
        <Text style={[styles.riskScoreValue, { color }]}>{consumer.riskScore}%</Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${consumer.riskScore}%`, backgroundColor: color },
          ]}
        />
      </View>

      <View style={styles.consumptionRow}>
        <Text style={[styles.consumptionText, { color: colors.subText }]}>
          📈 Consumption{" "}
          <Text style={[styles.consumptionValue, { color: colors.text }]}>
            {formatNumber(consumer.consumption)}kWh
          </Text>
        </Text>
        {consumer.anomaly > 0 && (
          <Text style={[styles.anomalyText, { color }]}>
            +{formatNumber(consumer.anomaly)}% anomaly
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ──────────────────────────────────────────────────
export default function RisksScreen() {
  const router = useRouter();
  const { colors } = useAppSettings();

  const [filter, setFilter] = useState<FilterType>("All Risks");
  const [search, setSearch] = useState("");

  const { data, loading, refreshing, error, reload, pullRefresh, retry } =
    useApi<RiskListResponse>("/api/risks", { level: LEVEL_BY_FILTER[filter] });
  useLiveRefresh(reload); // Firestore mai change => list auto update

  // Search instant rakhne ke liye phone par filter hota hai
  const items = useMemo(() => {
    const list = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.name, c.consumerId, c.meterNumber, c.location]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, search]);

  const openProfile = (c: ConsumerSummary) => {
    // expo-router: navigation prop nahi hota, router.push use hota hai
    router.push({
      pathname: "/src/Admin/ConsumerProfileScreen",
      params: { id: c.id },
    } as any);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            High Risk Consumers
          </Text>
          <NotificationBell />
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by ID, name or area..."
            placeholderTextColor={colors.subText}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                filter === f && styles.filterBtnActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.subText },
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Consumer List */}
        <View style={styles.listContainer}>
          {loading && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          )}

          {!loading && !data && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Data load nahi ho saka
              </Text>
              {!!error && (
                <Text style={[styles.errorDetail, { color: colors.subText }]}>{error}</Text>
              )}
              <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading &&
            data &&
            items.map((c) => (
              <ConsumerCard key={c.id} consumer={c} onPress={() => openProfile(c)} />
            ))}

          {!loading && data && items.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                No consumers found
              </Text>
            </View>
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 16,
    borderRadius: 16,
    margin: 16,
    marginTop: 40,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  bellBtn: { position: "relative", padding: 4 },
  bellIcon: { fontSize: 22 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  filterScroll: { paddingHorizontal: 16, marginBottom: 14, flexGrow: 0 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterBtnActive: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  filterText: { fontSize: 13, fontWeight: "500" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { paddingHorizontal: 16, gap: 12 },
  consumerCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  consumerName: { fontSize: 16, fontWeight: "700" },
  fireIcon: { fontSize: 14 },
  riskBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText: { fontSize: 11, fontWeight: "600" },
  consumerMeta: { fontSize: 12, marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  locationIcon: { fontSize: 12, marginRight: 4 },
  locationText: { fontSize: 12 },
  riskScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  riskScoreLabel: { fontSize: 12 },
  riskScoreValue: { fontSize: 13, fontWeight: "700" },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  consumptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  consumptionText: { fontSize: 12 },
  consumptionValue: { fontWeight: "600" },
  anomalyText: { fontSize: 12, fontWeight: "600" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 15, fontWeight: "600" },
  errorDetail: { fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 12 },
  retryBtn: {
    backgroundColor: palette.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
