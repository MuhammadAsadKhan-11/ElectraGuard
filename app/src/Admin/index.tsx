// app/src/Admin/DashboardScreen.tsx
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import NotificationBell from "../../../components/NotificationBell";
import { formatNumber, niceCeil, palette } from "../../../constants/adminUi";
import { auth, db } from "../../../firebaseConfig";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import {
  ChartPoint,
  DashboardResponse,
  useApi,
  useLiveRefresh,
} from "../../../hooks/useAdminApi";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;
const PLOT_LEFT = 34; // y-axis labels ke liye jagah
const PLOT_RIGHT = 10;

const KPI_IMAGES = [
  require("../../../assets/ChartLine.png"),
  require("../../../assets/Users.png"),
  require("../../../assets/ShieldWarning.png"),
  require("../../../assets/Suitcase.png"),
  require("../../../assets/CurrencyDollar.png"),
  require("../../../assets/CheckCircle.png"),
];

// ─── KPI Card ────────────────────────────────────────────────
const KPICard = ({
  title,
  value,
  subtitle,
  color,
  badge,
  imageIndex,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  badge?: { label: string; color: string };
  imageIndex: number;
}) => {
  const { colors } = useAppSettings();
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
      <View style={styles.kpiHeader}>
        <Image
          source={KPI_IMAGES[imageIndex]}
          style={styles.kpiIcon}
          resizeMode="contain"
        />
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.color + "20" }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.kpiValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.kpiTitle, { color: colors.subText }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.kpiSubtitle, { color: colors.subText }]}>
        {subtitle}
      </Text>
    </View>
  );
};

const changeBadge = (pct: number | null | undefined) =>
  pct === null || pct === undefined
    ? undefined
    : {
        label: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}%`,
        color: pct >= 0 ? palette.success : palette.danger,
      };

// ─── Chart (red = theft, blue = normal) ──────────────────────
const MiniChart = ({
  points,
  spikeRatio,
}: {
  points: ChartPoint[];
  spikeRatio: number | null;
}) => {
  const { colors } = useAppSettings();

  const rawMax = Math.max(1, ...points.flatMap((p) => [p.normal, p.theft]));
  const maxVal = niceCeil(rawMax);
  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;

  const getY = (val: number) =>
    CHART_HEIGHT - 10 - (val / maxVal) * (CHART_HEIGHT * 0.85);
  const getX = (i: number) =>
    points.length > 1 ? PLOT_LEFT + (i / (points.length - 1)) * plotWidth : PLOT_LEFT;

  const ticks = [0.25, 0.5, 0.75, 1].map((f) => ({
    value: Math.round(maxVal * f),
    bottom: 10 + f * CHART_HEIGHT * 0.85 - 6,
  }));

  const segment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    key: string,
  ) => {
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    return (
      <View
        key={key}
        style={[
          styles.chartLine,
          {
            left: x1,
            top: y1,
            width: len,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />
    );
  };

  return (
    <View>
      <View style={styles.chartHeaderRow}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Total Consumption
          </Text>
          <Text style={[styles.chartSub, { color: colors.subText }]}>
            Last 7 days
          </Text>
        </View>
        {spikeRatio !== null && spikeRatio >= 1.2 && (
          <View style={styles.spikeTag}>
            <Text style={styles.spikeTagText}>▲ {spikeRatio}x spike</Text>
          </View>
        )}
      </View>

      <View style={{ height: CHART_HEIGHT + 18, marginTop: 8 }}>
        {ticks.map((t) => (
          <View key={t.value} style={[styles.gridLineRow, { bottom: t.bottom + 18 }]}>
            <Text style={[styles.gridLabel, { color: colors.subText }]}>
              {t.value}
            </Text>
            <View style={[styles.gridLineSep, { backgroundColor: colors.border }]} />
          </View>
        ))}

        <View style={[styles.plotArea, { height: CHART_HEIGHT }]}>
          {points.map((p, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            return (
              <React.Fragment key={`seg-${p.date}`}>
                {segment(getX(i - 1), getY(prev.normal), getX(i), getY(p.normal), palette.accent, `n-${i}`)}
                {segment(getX(i - 1), getY(prev.theft), getX(i), getY(p.theft), palette.danger, `t-${i}`)}
              </React.Fragment>
            );
          })}
          {points.map((p, i) => (
            <React.Fragment key={`dots-${p.date}`}>
              <View
                style={[
                  styles.chartDot,
                  { left: getX(i) - 4, top: getY(p.normal) - 4, backgroundColor: palette.accent },
                ]}
              />
              <View
                style={[
                  styles.chartDot,
                  { left: getX(i) - 4, top: getY(p.theft) - 4, backgroundColor: palette.danger },
                ]}
              />
            </React.Fragment>
          ))}
        </View>

        {points.map((p, i) => (
          <Text
            key={`x-${p.date}`}
            style={[
              styles.xLabel,
              { left: getX(i) - 18, top: CHART_HEIGHT + 4, color: colors.subText },
            ]}
          >
            {p.label}
          </Text>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
          <Text style={[styles.legendText, { color: colors.subText }]}>Theft</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.legendText, { color: colors.subText }]}>
            Normal Consumption
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useAppSettings();

  const { data, loading, refreshing, error, reload, pullRefresh, retry } =
    useApi<DashboardResponse>("/api/dashboard");
  useLiveRefresh(reload); // Firestore mai change => dashboard auto update

  // Admin name Firebase se
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const adminSnap = await getDocs(
          query(collection(db, "admins"), where("uid", "==", user.uid)),
        );
        if (!adminSnap.empty) {
          const adminData = adminSnap.docs[0].data();
          setAdminName(
            adminData.name || adminData.fullName || adminData.email || "Admin",
          );
        }
      } catch (err) {
        console.log("Error fetching admin name:", err);
      }
    });
    return () => unsubscribe();
  }, []);

  const k = data?.kpis;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={pullRefresh} />
        }
      >
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Admin Dashboard
            </Text>
            <Text style={styles.adminName}>{adminName}</Text>
            <Text style={[styles.adminRole, { color: colors.subText }]}>
              System Administrator
            </Text>
          </View>

          <NotificationBell />
        </View>

        {loading && !data && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        )}

        {!loading && !data && (
          <View style={styles.centerBox}>
            <Text style={[styles.errorText, { color: colors.text }]}>
              Dashboard load nahi ho saka
            </Text>
            {!!error && (
              <Text style={[styles.errorDetail, { color: colors.subText }]}>
                {error}
              </Text>
            )}
            <TouchableOpacity style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && k && (
          <>
            {/* ── KPIs ── */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Key Performance Indicators
            </Text>
            <View style={styles.kpiGrid}>
              <KPICard
                imageIndex={0}
                title="Total Consumers"
                value={formatNumber(k.totalConsumptionKwh)}
                subtitle={`${k.consumptionScopeLabel} • ${formatNumber(k.totalConsumers)} consumers`}
                color={colors.text}
                badge={changeBadge(k.consumptionChangePct)}
              />
              <KPICard
                imageIndex={1}
                title="Active Members"
                value={formatNumber(k.activeMembers)}
                subtitle={`${k.activePct}% active • ${formatNumber(k.registeredCount)} registered`}
                color={colors.text}
              />
              <KPICard
                imageIndex={2}
                title="High-Risk Consumers"
                value={formatNumber(k.highRiskConsumers)}
                subtitle={`${k.highRiskPct}% of total`}
                color={palette.danger}
              />
              <KPICard
                imageIndex={3}
                title="Theft Cases"
                value={formatNumber(k.theftCases)}
                subtitle="Active cases"
                color={palette.danger}
              />
              <KPICard
                imageIndex={4}
                title="Revenue Loss"
                value={k.revenueLossFormatted}
                subtitle="Estimated monthly"
                color={colors.text}
              />
              <KPICard
                imageIndex={5}
                title="Cases Resolved"
                value={formatNumber(k.casesResolved)}
                subtitle="This month"
                color={palette.success}
                badge={changeBadge(k.casesResolvedChangePct)}
              />
            </View>

            {/* ── Chart ── */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Consumption & Theft Analytics
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <MiniChart
                points={data.chart.points}
                spikeRatio={data.chart.spikeRatio}
              />
            </View>
          </>
        )}

        {/* ── Quick Actions ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card }]}
            onPress={() => router.push("/src/Admin/RisksScreen" as any)}
          >
            <Text style={[styles.quickBtnText, { color: colors.text }]}>
              View Risk List
            </Text>
            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card }]}
            onPress={() => router.push("/src/Admin/CasesScreen" as any)}
          >
            <Text style={[styles.quickBtnText, { color: colors.text }]}>
              Open Cases
            </Text>
            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card }]}
            onPress={() => router.push("/src/Admin/ReportsScreen" as any)}
          >
            <Text style={[styles.quickBtnText, { color: colors.text }]}>
              Reports
            </Text>
            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    margin: 16,
    borderRadius: 16,
    marginTop: 40,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  adminName: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.accent,
    marginTop: 4,
  },
  adminRole: { fontSize: 12 },
  bellBtn: { position: "relative", padding: 4 },
  bellImage: { width: 28, height: 28 },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: palette.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },

  centerBox: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  errorText: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  errorDetail: { fontSize: 12, textAlign: "center", marginBottom: 14 },
  retryBtn: {
    backgroundColor: palette.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    borderRadius: 14,
    padding: 14,
    width: (width - 40) / 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiIcon: { width: 32, height: 32 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  kpiValue: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  kpiTitle: { fontSize: 11, fontWeight: "500" },
  kpiSubtitle: { fontSize: 10, marginTop: 2 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartTitle: { fontSize: 15, fontWeight: "700" },
  chartSub: { fontSize: 11, marginTop: 2 },
  spikeTag: {
    backgroundColor: "#FF3B3020",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spikeTagText: { color: palette.danger, fontSize: 11, fontWeight: "600" },
  plotArea: { position: "absolute", left: 0, right: 0, top: 0 },
  gridLineRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  gridLabel: { fontSize: 9, width: 30 },
  gridLineSep: { flex: 1, height: 1, opacity: 0.6 },
  chartLine: {
    position: "absolute",
    height: 2,
    transformOrigin: "0 0",
    borderRadius: 1,
  },
  chartDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  xLabel: {
    position: "absolute",
    width: 36,
    textAlign: "center",
    fontSize: 9,
  },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  quickGrid: { paddingHorizontal: 16, gap: 10 },
  quickBtn: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickBtnText: { fontSize: 14, fontWeight: "600" },
  quickArrow: { fontSize: 20, color: palette.primary },
});
