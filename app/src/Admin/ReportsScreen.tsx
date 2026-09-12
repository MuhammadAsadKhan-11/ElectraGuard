// ReportsScreen.tsx
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Reports & Analytics Screen (TypeScript)
// Firebase "keyInsights" collection se Key Insights fetch karta hai
// ─────────────────────────────────────────────────────────────
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";
import { useAppSettings } from "../../../hooks/AppSettingContext";

// ─────────────────────────────────────────────────────────────
// STAT CARD IMAGES — apni images ke paths yahan replace karo
// ─────────────────────────────────────────────────────────────
const STAT_IMAGES = {
  totalCases: require("../../../assets/ChartBar.png"),
  revenueLoss: require("../../../assets/CurrencyDollar.png"),
  detectionRate: require("../../../assets/ChartBar.png"),
  avgResponse: require("../../../assets/ChartBar.png"),
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type FilterPeriod = "Last 7 days" | "Last 30 days" | "Last 3 months";

interface StatCard {
  imageKey: keyof typeof STAT_IMAGES;
  iconBg: string;
  value: string;
  label: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
}

interface BarData {
  label: string;
  value: number;
}

interface PieSlice {
  label: string;
  percent: number;
  color: string;
}

interface KeyInsight {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  order: number;
}

// ─────────────────────────────────────────────────────────────
// STATIC DATA (stats, charts — period-based)
// ─────────────────────────────────────────────────────────────
const PERIOD_DATA: Record<
  FilterPeriod,
  {
    stats: StatCard[];
    areaTheft: BarData[];
    revenueLoss: BarData[];
    pie: PieSlice[];
  }
> = {
  "Last 7 days": {
    stats: [
      {
        imageKey: "totalCases",
        iconBg: "#EFF6FF",
        value: "49",
        label: "Total Cases (Month)",
        badge: "+12%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
      {
        imageKey: "revenueLoss",
        iconBg: "#FFF1F2",
        value: "PKR 2.4M",
        label: "Revenue Loss",
        badge: "+8%",
        badgeColor: "#E11D48",
        badgeBg: "#FFF1F2",
      },
      {
        imageKey: "detectionRate",
        iconBg: "#EFF6FF",
        value: "87%",
        label: "Detection Rate",
        badge: "+5%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
      {
        imageKey: "avgResponse",
        iconBg: "#EFF6FF",
        value: "4.2h",
        label: "Avg Response Time",
        badge: "-15%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
    ],
    areaTheft: [
      { label: "Sector 12", value: 45 },
      { label: "Sector 23", value: 60 },
      { label: "Sector 4", value: 30 },
      { label: "Sector 11", value: 25 },
      { label: "Sector 7", value: 50 },
    ],
    revenueLoss: [
      { label: "Sector 12", value: 150000 },
      { label: "Sector 23", value: 80000 },
      { label: "Sector 4", value: 200000 },
      { label: "Sector 11", value: 40000 },
      { label: "Sector 7", value: 120000 },
    ],
    pie: [
      { label: "Low Risk", percent: 63, color: "#0B7A75" },
      { label: "Medium Risk", percent: 25, color: "#F59E0B" },
      { label: "High Risk", percent: 12, color: "#E11D48" },
    ],
  },
  "Last 30 days": {
    stats: [
      {
        imageKey: "totalCases",
        iconBg: "#EFF6FF",
        value: "182",
        label: "Total Cases (Month)",
        badge: "+18%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
      {
        imageKey: "revenueLoss",
        iconBg: "#FFF1F2",
        value: "PKR 9.1M",
        label: "Revenue Loss",
        badge: "+11%",
        badgeColor: "#E11D48",
        badgeBg: "#FFF1F2",
      },
      {
        imageKey: "detectionRate",
        iconBg: "#EFF6FF",
        value: "91%",
        label: "Detection Rate",
        badge: "+7%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
      {
        imageKey: "avgResponse",
        iconBg: "#EFF6FF",
        value: "3.8h",
        label: "Avg Response Time",
        badge: "-20%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
    ],
    areaTheft: [
      { label: "Sector 12", value: 70 },
      { label: "Sector 23", value: 95 },
      { label: "Sector 4", value: 55 },
      { label: "Sector 11", value: 40 },
      { label: "Sector 7", value: 80 },
    ],
    revenueLoss: [
      { label: "Sector 12", value: 220000 },
      { label: "Sector 23", value: 130000 },
      { label: "Sector 4", value: 310000 },
      { label: "Sector 11", value: 70000 },
      { label: "Sector 7", value: 180000 },
    ],
    pie: [
      { label: "Low Risk", percent: 58, color: "#0B7A75" },
      { label: "Medium Risk", percent: 28, color: "#F59E0B" },
      { label: "High Risk", percent: 14, color: "#E11D48" },
    ],
  },
  "Last 3 months": {
    stats: [
      {
        imageKey: "totalCases",
        iconBg: "#EFF6FF",
        value: "510",
        label: "Total Cases (Quarter)",
        badge: "+22%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
      {
        imageKey: "revenueLoss",
        iconBg: "#FFF1F2",
        value: "PKR 27M",
        label: "Revenue Loss",
        badge: "+14%",
        badgeColor: "#E11D48",
        badgeBg: "#FFF1F2",
      },
      {
        imageKey: "detectionRate",
        iconBg: "#EFF6FF",
        value: "93%",
        label: "Detection Rate",
        badge: "+9%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
      {
        imageKey: "avgResponse",
        iconBg: "#EFF6FF",
        value: "3.5h",
        label: "Avg Response Time",
        badge: "-25%",
        badgeColor: "#16A34A",
        badgeBg: "#F0FFF4",
      },
    ],
    areaTheft: [
      { label: "Sector 12", value: 130 },
      { label: "Sector 23", value: 175 },
      { label: "Sector 4", value: 100 },
      { label: "Sector 11", value: 80 },
      { label: "Sector 7", value: 145 },
    ],
    revenueLoss: [
      { label: "Sector 12", value: 500000 },
      { label: "Sector 23", value: 320000 },
      { label: "Sector 4", value: 700000 },
      { label: "Sector 11", value: 180000 },
      { label: "Sector 7", value: 420000 },
    ],
    pie: [
      { label: "Low Risk", percent: 55, color: "#0B7A75" },
      { label: "Medium Risk", percent: 30, color: "#F59E0B" },
      { label: "High Risk", percent: 15, color: "#E11D48" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// PIE CHART COMPONENT (SVG-like using Views)
// ─────────────────────────────────────────────────────────────
const SimplePieChart: React.FC<{ slices: PieSlice[] }> = ({ slices }) => {
  const size = 140;
  const radius = 60;
  const cx = size / 2;
  const cy = size / 2;

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleDeg: number,
  ) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad),
    };
  };

  let cumulativePercent = 0;
  const paths = slices.map((slice) => {
    const startAngle = cumulativePercent * 3.6;
    cumulativePercent += slice.percent;
    const endAngle = cumulativePercent * 3.6;
    const largeArc = slice.percent > 50 ? 1 : 0;
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    return { ...slice, start, end, largeArc };
  });

  // Use View-based approximation since SVG needs react-native-svg
  // We'll render colored arc segments as percentage bars instead
  return (
    <View style={pieStyles.container}>
      <View style={pieStyles.circle}>
        {slices.map((slice, i) => (
          <View
            key={i}
            style={[
              pieStyles.segment,
              {
                backgroundColor: slice.color,
                flex: slice.percent,
              },
            ]}
          />
        ))}
      </View>
      <View style={pieStyles.legend}>
        {slices.map((slice, i) => (
          <View key={i} style={pieStyles.legendRow}>
            <View style={[pieStyles.dot, { backgroundColor: slice.color }]} />
            <Text style={pieStyles.legendText}>{slice.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PieChartSVG: React.FC<{ slices: PieSlice[] }> = ({ slices }) => {
  // Render a donut-style chart using nested View + rotation tricks
  const SIZE = 160;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: SIZE, height: SIZE, position: "relative" }}>
        {/* Outer ring segments using border trick */}
        <DonutChart slices={slices} size={SIZE} />
      </View>
      {/* Labels */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 12,
          gap: 10,
        }}
      >
        {slices.map((s, i) => (
          <View
            key={i}
            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: s.color,
              }}
            />
            <Text style={{ fontSize: 11, color: "#6B7280" }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const DonutChart: React.FC<{ slices: PieSlice[]; size: number }> = ({
  slices,
  size,
}) => {
  const radius = size / 2;
  const strokeWidth = 28;
  const innerRadius = radius - strokeWidth;
  const circumference = 2 * Math.PI * innerRadius;

  let cumulativePercent = 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {slices.map((slice, i) => {
        const offset = circumference * (1 - cumulativePercent / 100);
        const dash = (slice.percent / 100) * circumference;
        cumulativePercent += slice.percent;

        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: "transparent",
            }}
          />
        );
      })}
      {/* Fallback: Simple concentric arc look using stacked views */}
      <PieSegmentsView slices={slices} size={size} />
    </View>
  );
};

// Clean pie using View segments with overflow hidden trick
const PieSegmentsView: React.FC<{ slices: PieSlice[]; size: number }> = ({
  slices,
  size,
}) => {
  const half = size / 2;

  let rotationDeg = 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: half,
        overflow: "hidden",
        backgroundColor: "#E5E7EB",
      }}
    >
      {slices.map((slice, i) => {
        const deg = (slice.percent / 100) * 360;
        const currentRot = rotationDeg;
        rotationDeg += deg;

        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size,
              transform: [{ rotate: `${currentRot}deg` }],
            }}
          >
            <View
              style={{
                width: half,
                height: size,
                left: half,
                overflow: "hidden",
                position: "absolute",
              }}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: half,
                  backgroundColor: slice.color,
                  position: "absolute",
                  right: 0,
                  transform: [{ rotate: `${Math.min(deg, 180)}deg` }],
                }}
              />
            </View>
          </View>
        );
      })}
      {/* Inner white circle for donut effect */}
      <View
        style={{
          position: "absolute",
          width: size * 0.52,
          height: size * 0.52,
          borderRadius: (size * 0.52) / 2,
          backgroundColor: "#fff",
          left: size * 0.24,
          top: size * 0.24,
        }}
      />
    </View>
  );
};

const pieStyles = StyleSheet.create({
  container: { alignItems: "center" },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: "hidden",
    flexDirection: "row",
  },
  segment: { height: "100%" },
  legend: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#6B7280" },
});

// ─────────────────────────────────────────────────────────────
// BAR CHART COMPONENT
// ─────────────────────────────────────────────────────────────
const BarChart: React.FC<{
  data: BarData[];
  color: string;
  yLabel?: string;
}> = ({ data, color, yLabel }) => {
  const maxVal = Math.max(...data.map((d) => d.value));
  const CHART_HEIGHT = 120;
  const BAR_WIDTH = (CHART_WIDTH - 40) / data.length - 10;

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.chart}>
        {/* Y-axis lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
          <View
            key={i}
            style={[barStyles.gridLine, { bottom: frac * CHART_HEIGHT }]}
          />
        ))}
        {/* Bars */}
        <View style={barStyles.barsRow}>
          {data.map((d, i) => {
            const barH = (d.value / maxVal) * CHART_HEIGHT;
            return (
              <View key={i} style={[barStyles.barCol, { width: BAR_WIDTH }]}>
                <View
                  style={[
                    barStyles.bar,
                    { height: barH, backgroundColor: color, width: BAR_WIDTH },
                  ]}
                />
                <Text style={barStyles.barLabel} numberOfLines={1}>
                  {d.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  wrapper: { marginTop: 8 },
  chart: {
    height: 150,
    position: "relative",
    justifyContent: "flex-end",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingBottom: 24,
  },
  barCol: { alignItems: "center" },
  bar: { borderRadius: 4 },
  barLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────
// INSIGHT CARD COMPONENT
// ─────────────────────────────────────────────────────────────
const InsightCard: React.FC<{ insight: KeyInsight }> = ({ insight }) => (
  <View style={insightStyles.card}>
    <View
      style={[
        insightStyles.iconBox,
        { backgroundColor: insight.iconBg || "#FFF1F2" },
      ]}
    >
      <Ionicons
        name={(insight.icon as IoniconsName) || "alert-circle-outline"}
        size={18}
        color={insight.iconColor || "#E11D48"}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={insightStyles.title}>{insight.title}</Text>
      <Text style={insightStyles.subtitle}>{insight.subtitle}</Text>
    </View>
  </View>
);

const insightStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 13, fontWeight: "700", color: "#1A202C", marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#9CA3AF", lineHeight: 16 },
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function ReportsScreen(): React.ReactElement {
  const { colors } = useAppSettings();
  const [period, setPeriod] = useState<FilterPeriod>("Last 7 days");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [insights, setInsights] = useState<KeyInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const currentData = PERIOD_DATA[period];

  // ── Fetch Key Insights from Firebase ────────────────────
  const fetchInsights = useCallback(async () => {
    try {
      setInsightsError(null);
      const q = query(collection(db, "keyInsights"), orderBy("order"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Seed default insights if collection is empty
        await seedDefaultInsights();
        const snapshot2 = await getDocs(q);
        setInsights(
          snapshot2.docs.map((d) => ({ id: d.id, ...d.data() }) as KeyInsight),
        );
      } else {
        setInsights(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as KeyInsight),
        );
      }
    } catch (err) {
      console.error("Insights fetch error:", err);
      setInsightsError("Insights load nahi ho sake.");
      // Fallback static insights
      setInsights(DEFAULT_INSIGHTS);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const PERIODS: FilterPeriod[] = [
    "Last 7 days",
    "Last 30 days",
    "Last 3 months",
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Reports & Analytics</Text>
              <Text style={styles.headerSubtitle}>
                Theft statistics and performance metrics
              </Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#0B3C5D"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filter + Export Row ── */}
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterText}>{period}</Text>
              <Ionicons
                name={showPeriodDropdown ? "chevron-up" : "chevron-down"}
                size={14}
                color="#0B3C5D"
              />
            </TouchableOpacity>
            {showPeriodDropdown && (
              <View style={styles.dropdown}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.dropdownItem,
                      period === p && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setPeriod(p);
                      setShowPeriodDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        period === p && styles.dropdownTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={15} color="#fff" />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stat Cards Grid ── */}
        <View style={styles.statsGrid}>
          {currentData.stats.map((card, i) => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statCardTop}>
                <View
                  style={[styles.statIconBox, { backgroundColor: card.iconBg }]}
                >
                  <Image
                    source={STAT_IMAGES[card.imageKey]}
                    style={styles.statImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.badge, { backgroundColor: card.badgeBg }]}>
                  <Text style={[styles.badgeText, { color: card.badgeColor }]}>
                    {card.badge}
                  </Text>
                </View>
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Risk Distribution ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Risk Distribution</Text>
          <View style={styles.pieWrapper}>
            {/* Donut-style pie representation */}
            <View style={styles.pieContainer}>
              <PieDisplay slices={currentData.pie} />
            </View>
            {/* Legend with percentages */}
            <View style={styles.pieLegend}>
              {currentData.pie.map((s, i) => (
                <View key={i} style={styles.pieLegendRow}>
                  <View style={[styles.pieDot, { backgroundColor: s.color }]} />
                  <Text style={styles.pieLegendLabel}>{s.label}</Text>
                  <Text style={[styles.pieLegendPct, { color: s.color }]}>
                    {s.percent}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {/* Legend dots row at bottom */}
          <View style={styles.pieBottomLegend}>
            {currentData.pie.map((s, i) => (
              <View key={i} style={styles.pieLegendRowH}>
                <View style={[styles.pieDot, { backgroundColor: s.color }]} />
                <Text style={styles.pieLegendLabelSm}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Area-wise Theft Cases ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Area-wise Theft Cases</Text>
          <BarChart data={currentData.areaTheft} color="#0B3C5D" />
        </View>

        {/* ── Revenue Loss by Area ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Loss by Area</Text>
          <BarChart data={currentData.revenueLoss} color="#E11D48" />
        </View>

        {/* ── Key Insights ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Key Insights</Text>
          {insightsLoading ? (
            <View style={styles.insightsLoader}>
              <ActivityIndicator size="small" color="#0B3C5D" />
              <Text style={styles.loadingText}>Loading insights...</Text>
            </View>
          ) : insightsError ? (
            <View style={styles.insightsLoader}>
              <Text style={styles.errorText}>{insightsError}</Text>
              <TouchableOpacity onPress={fetchInsights} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// PIE DISPLAY — clean segmented circle using View
// ─────────────────────────────────────────────────────────────
const PieDisplay: React.FC<{ slices: PieSlice[] }> = ({ slices }) => {
  const SIZE = 150;
  const BORDER = 30;

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background circle */}
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: "#F1F5F9",
          position: "absolute",
        }}
      />
      {/* Segments — stacked arc trick */}
      {renderPieSegments(slices, SIZE)}
      {/* Inner white hole */}
      <View
        style={{
          width: SIZE - BORDER * 2,
          height: SIZE - BORDER * 2,
          borderRadius: (SIZE - BORDER * 2) / 2,
          backgroundColor: "#fff",
          position: "absolute",
        }}
      />
    </View>
  );
};

function renderPieSegments(slices: PieSlice[], size: number) {
  const half = size / 2;
  let cumulative = 0;
  const elements: React.ReactElement[] = [];

  slices.forEach((slice, i) => {
    const startDeg = (cumulative / 100) * 360;
    const endDeg = ((cumulative + slice.percent) / 100) * 360;
    cumulative += slice.percent;

    // Split segment if > 180 degrees
    if (slice.percent > 50) {
      // First half (0-180)
      elements.push(
        <View
          key={`${i}a`}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: [{ rotate: `${startDeg}deg` }],
          }}
        >
          <View
            style={{
              position: "absolute",
              width: half,
              height: size,
              left: half,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: half,
                backgroundColor: slice.color,
                right: 0,
                transform: [{ rotate: "180deg" }],
              }}
            />
          </View>
        </View>,
      );
      // Second half
      elements.push(
        <View
          key={`${i}b`}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: [{ rotate: `${startDeg + 180}deg` }],
          }}
        >
          <View
            style={{
              position: "absolute",
              width: half,
              height: size,
              left: half,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: half,
                backgroundColor: slice.color,
                right: 0,
                transform: [{ rotate: `${endDeg - startDeg - 180}deg` }],
              }}
            />
          </View>
        </View>,
      );
    } else {
      elements.push(
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: [{ rotate: `${startDeg}deg` }],
          }}
        >
          <View
            style={{
              position: "absolute",
              width: half,
              height: size,
              left: half,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: half,
                backgroundColor: slice.color,
                right: 0,
                transform: [{ rotate: `${endDeg - startDeg}deg` }],
              }}
            />
          </View>
        </View>,
      );
    }
  });

  return elements;
}

// ─────────────────────────────────────────────────────────────
// DEFAULT INSIGHTS (fallback if Firebase empty/error)
// ─────────────────────────────────────────────────────────────
const DEFAULT_INSIGHTS: KeyInsight[] = [
  {
    id: "1",
    icon: "alert-circle-outline",
    iconColor: "#E11D48",
    iconBg: "#FFF1F2",
    title: "High theft activity in Blue Area",
    subtitle: "19k cases reported this month, 24% increase from last month",
    order: 1,
  },
  {
    id: "2",
    icon: "trending-up-outline",
    iconColor: "#0B3C5D",
    iconBg: "#EFF6FF",
    title: "Detection rate improved by 5%",
    subtitle: "AI-powered anomaly detection showing better accuracy",
    order: 2,
  },
  {
    id: "3",
    icon: "cash-outline",
    iconColor: "#D97706",
    iconBg: "#FFF7ED",
    title: "Potential savings of 12.5L identified",
    subtitle: "Through proactive monitoring and early detection",
    order: 3,
  },
];

// ─────────────────────────────────────────────────────────────
// SEED FUNCTION — call once to populate Firebase
// ─────────────────────────────────────────────────────────────
async function seedDefaultInsights() {
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    for (const insight of DEFAULT_INSIGHTS) {
      await setDoc(doc(db, "keyInsights", insight.id), {
        icon: insight.icon,
        iconColor: insight.iconColor,
        iconBg: insight.iconBg,
        title: insight.title,
        subtitle: insight.subtitle,
        order: insight.order,
      });
    }
    console.log("keyInsights seeded successfully.");
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Header
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 40,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0B3C5D",
    textDecorationLine: "underline",
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 13, color: "#6B7280" },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  // Filter row
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    zIndex: 10,
  },
  filterBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#1CA7A6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  filterText: { fontSize: 13, color: "#0B3C5D", fontWeight: "600" },
  dropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemActive: { backgroundColor: "#EFF6FF" },
  dropdownText: { fontSize: 13, color: "#374151" },
  dropdownTextActive: { color: "#0B3C5D", fontWeight: "700" },
  exportBtn: {
    backgroundColor: "#1CA7A6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exportText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statImage: {
    width: 24,
    height: 24,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A202C",
    marginBottom: 2,
  },
  statLabel: { fontSize: 11, color: "#9CA3AF", lineHeight: 15 },

  // Chart card
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A202C",
    marginBottom: 14,
  },

  // Pie
  pieWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pieContainer: { alignItems: "center", justifyContent: "center" },
  pieLegend: { flex: 1, paddingLeft: 20, gap: 10 },
  pieLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pieDot: { width: 8, height: 8, borderRadius: 4 },
  pieLegendLabel: { flex: 1, fontSize: 12, color: "#374151" },
  pieLegendPct: { fontSize: 13, fontWeight: "800" },
  pieBottomLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pieLegendRowH: { flexDirection: "row", alignItems: "center", gap: 5 },
  pieLegendLabelSm: { fontSize: 11, color: "#6B7280" },

  // Insights
  insightsLoader: { alignItems: "center", paddingVertical: 20, gap: 8 },
  loadingText: { color: "#718096", fontSize: 13 },
  errorText: { color: "#718096", fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#0B3C5D",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
