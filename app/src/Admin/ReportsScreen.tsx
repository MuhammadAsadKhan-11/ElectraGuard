// app/src/Admin/ReportsScreen.tsx
// Reports & Analytics — all data comes from the FastAPI backend (GET /reports/summary).
// Requires: npx expo install react-native-svg
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import {
  fetchReportCsv,
  InsightType,
  ReportPeriod,
  useReportsSummary,
} from "../../../hooks/useReportsApi";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64; // scroll padding (32) + card padding (32)

const NAVY = "#0B3C5D";
const TEAL = "#1CA7A6";

const PERIODS: { key: ReportPeriod; label: string; noun: string }[] = [
  { key: "7d", label: "Last 7 days", noun: "Week" },
  { key: "30d", label: "Last 30 days", noun: "Month" },
  { key: "3m", label: "Last 3 months", noun: "Quarter" },
];

const INSIGHT_STYLE: Record<InsightType, { icon: IoniconsName; color: string }> = {
  alert: { icon: "alert-circle-outline", color: "#E11D48" },
  success: { icon: "trending-up-outline", color: "#0F9D8F" },
  savings: { icon: "cash-outline", color: "#D97706" },
  info: { icon: "information-circle-outline", color: "#2B6CB0" },
};

// ─────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────
const compact = (n: number): string => {
  const abs = Math.abs(n);
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return String(Math.round(n * 10) / 10);
};

const formatPKR = (n: number): string => `PKR ${compact(n)}`;

const niceScale = (max: number): { top: number; ticks: number[] } => {
  if (!isFinite(max) || max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const stepNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = stepNorm * mag;
  const ticks = [0, 1, 2, 3, 4].map((i) => Number((i * step).toFixed(6)));
  return { top: step * 4, ticks };
};

// ─────────────────────────────────────────────────────────────
// CHARTS (react-native-svg)
// ─────────────────────────────────────────────────────────────
interface BarDatum {
  label: string;
  value: number;
}

const BarChart: React.FC<{
  data: BarDatum[];
  color: string;
  formatTick: (n: number) => string;
  textColor: string;
  gridColor: string;
}> = ({ data, color, formatTick, textColor, gridColor }) => {
  const W = CHART_WIDTH;
  const H = 210;
  const PAD = { left: 44, right: 6, top: 10, bottom: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const { top, ticks } = niceScale(Math.max(0, ...data.map((d) => d.value)));
  const slot = data.length ? plotW / data.length : plotW;
  const barW = Math.min(30, slot * 0.55);

  if (data.length === 0) {
    return <Text style={{ color: textColor, fontSize: 12 }}>No data for this period.</Text>;
  }

  return (
    <Svg width={W} height={H}>
      {ticks.map((t) => {
        const y = PAD.top + plotH - (t / top) * plotH;
        return (
          <G key={t}>
            <Line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <SvgText x={PAD.left - 6} y={y + 3} fontSize={9} fill={textColor} textAnchor="end">
              {formatTick(t)}
            </SvgText>
          </G>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / top) * plotH;
        const cx = PAD.left + slot * i + slot / 2;
        const y = PAD.top + plotH - h;
        const ly = PAD.top + plotH + 12;
        const label = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label;
        return (
          <G key={`${d.label}-${i}`}>
            <Rect x={cx - barW / 2} y={y} width={barW} height={h} rx={3} fill={color} />
            <SvgText
              x={cx + 4}
              y={ly}
              fontSize={9}
              fill={textColor}
              textAnchor="end"
              rotation={-40}
              origin={`${cx + 4}, ${ly}`}
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

const PIE_COLORS = { low: "#2A9D8F", medium: "#F4A261", high: "#E76F51" };

const RiskPie: React.FC<{
  low: number;
  medium: number;
  high: number;
  textColor: string;
}> = ({ low, medium, high, textColor }) => {
  const slices = [
    { label: "Low Risk", value: low, color: PIE_COLORS.low },
    { label: "Medium Risk", value: medium, color: PIE_COLORS.medium },
    { label: "High Risk", value: high, color: PIE_COLORS.high },
  ];
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const cx = 160;
  const cy = 90;
  const r = 60;

  const pt = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  let acc = 0;
  const parts = slices.map((s) => {
    const pct = total > 0 ? (Math.max(0, s.value) / total) * 100 : 0;
    const start = (acc / 100) * 360;
    acc += pct;
    const end = (acc / 100) * 360;
    return { ...s, pct, start, end };
  });

  return (
    <View>
      <Svg width="100%" height={190} viewBox="0 0 320 190">
        {total === 0 ? (
          <Circle cx={cx} cy={cy} r={r} fill="#E5E7EB" />
        ) : (
          parts.map((p) => {
            if (p.pct <= 0) return null;
            if (p.pct >= 99.99) return <Circle key={p.label} cx={cx} cy={cy} r={r} fill={p.color} />;
            const a = pt(p.start, r);
            const b = pt(p.end, r);
            const large = p.end - p.start > 180 ? 1 : 0;
            return (
              <Path
                key={p.label}
                d={`M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`}
                fill={p.color}
              />
            );
          })
        )}
        {parts.map((p) => {
          if (p.pct <= 0) return null;
          const mid = (p.start + p.end) / 2;
          const pos = pt(mid, r + 10);
          const cos = Math.cos(((mid - 90) * Math.PI) / 180);
          const anchor = cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle";
          return (
            <SvgText
              key={`t-${p.label}`}
              x={pos.x}
              y={pos.y + 3}
              fontSize={10}
              fill={textColor}
              textAnchor={anchor}
            >
              {`${p.label} ${Math.round(p.pct)}%`}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.pieLegend}>
        {slices.map((s) => (
          <View key={s.label} style={styles.pieLegendItem}>
            <View style={[styles.pieDot, { backgroundColor: s.color }]} />
            <Text style={[styles.pieLegendText, { color: textColor }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
const StatCardView: React.FC<{
  icon: IoniconsName;
  tint: string;
  value: string;
  label: string;
  changePct: number;
  goodWhenUp: boolean;
  cardColor: string;
  textColor: string;
  subColor: string;
}> = ({ icon, tint, value, label, changePct, goodWhenUp, cardColor, textColor, subColor }) => {
  const good = goodWhenUp ? changePct >= 0 : changePct <= 0;
  const badgeColor = good ? "#16A34A" : "#E11D48";
  const rounded = Math.round(changePct);
  return (
    <View style={[styles.statCard, { backgroundColor: cardColor }]}>
      <View style={styles.statCardTop}>
        <View style={[styles.statIconBox, { backgroundColor: tint + "18" }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor + "18" }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {rounded > 0 ? "+" : ""}
            {rounded}%
          </Text>
        </View>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function ReportsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useAppSettings();
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const [showPeriods, setShowPeriods] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, loading, refreshing, error, reload, pullRefresh } = useReportsSummary(period);
  const current = PERIODS.find((p) => p.key === period)!;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = await fetchReportCsv(period);
      await Share.share({ title: `ElectraGuard report (${current.label})`, message: csv });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const gridColor = colors.border;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} />}
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Reports & Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
              Theft statistics and performance metrics
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/src/Admin/AlertsScreen" as any)}
          >
            <Ionicons name="notifications-outline" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>

        {/* Filter + Export */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowPeriods((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.filterText}>{current.label}</Text>
            <Ionicons name={showPeriods ? "chevron-up" : "chevron-down"} size={14} color={TEAL} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={15} color="#fff" />
                <Text style={styles.exportText}>Export</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {showPeriods && (
          <View style={[styles.periodList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodItem, period === p.key && { backgroundColor: TEAL + "18" }]}
                onPress={() => {
                  setPeriod(p.key);
                  setShowPeriods(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: period === p.key ? TEAL : colors.text,
                    fontWeight: period === p.key ? "700" : "500",
                  }}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* States */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={[styles.centerText, { color: colors.subText }]}>Loading reports...</Text>
          </View>
        ) : !data ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.subText} />
            <Text style={[styles.centerText, { color: colors.subText, textAlign: "center" }]}>
              {error ?? "No report data available."}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reload}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!!error && (
              <Text style={styles.inlineError}>Could not refresh: {error}</Text>
            )}

            {/* Stat cards */}
            <View style={styles.statsGrid}>
              <StatCardView
                icon="bar-chart"
                tint="#2B6CB0"
                value={String(Math.round(data.stats.totalCases.value))}
                label={`Total Cases (${current.noun})`}
                changePct={data.stats.totalCases.changePct}
                goodWhenUp
                cardColor={colors.card}
                textColor={colors.text}
                subColor={colors.subText}
              />
              <StatCardView
                icon="cash-outline"
                tint="#E11D48"
                value={formatPKR(data.stats.revenueLoss.value)}
                label="Revenue Loss"
                changePct={data.stats.revenueLoss.changePct}
                goodWhenUp={false}
                cardColor={colors.card}
                textColor={colors.text}
                subColor={colors.subText}
              />
              <StatCardView
                icon="shield-checkmark-outline"
                tint="#0F9D8F"
                value={`${Math.round(data.stats.detectionRate.value)}%`}
                label="Detection Rate"
                changePct={data.stats.detectionRate.changePct}
                goodWhenUp
                cardColor={colors.card}
                textColor={colors.text}
                subColor={colors.subText}
              />
              <StatCardView
                icon="time-outline"
                tint="#2B6CB0"
                value={`${data.stats.avgResponseHours.value.toFixed(1)}h`}
                label="Avg Response Time"
                changePct={data.stats.avgResponseHours.changePct}
                goodWhenUp={false}
                cardColor={colors.card}
                textColor={colors.text}
                subColor={colors.subText}
              />
            </View>

            {/* Risk distribution */}
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Risk Distribution</Text>
              <RiskPie
                low={data.riskDistribution.low}
                medium={data.riskDistribution.medium}
                high={data.riskDistribution.high}
                textColor={colors.subText}
              />
            </View>

            {/* Area-wise theft */}
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Area-wise Theft Cases</Text>
              <BarChart
                data={data.areaTheft.map((a) => ({ label: a.area, value: a.cases }))}
                color={NAVY}
                formatTick={compact}
                textColor={colors.subText}
                gridColor={gridColor}
              />
            </View>

            {/* Revenue loss */}
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Revenue Loss by Area</Text>
              <BarChart
                data={data.revenueLossByArea.map((a) => ({ label: a.area, value: a.amount }))}
                color="#E5484D"
                formatTick={compact}
                textColor={colors.subText}
                gridColor={gridColor}
              />
            </View>

            {/* Key insights */}
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Key Insights</Text>
              {data.insights.length === 0 ? (
                <Text style={{ color: colors.subText, fontSize: 12 }}>No insights for this period.</Text>
              ) : (
                data.insights.map((ins) => {
                  const st = INSIGHT_STYLE[ins.type] ?? INSIGHT_STYLE.info;
                  return (
                    <View key={ins.id} style={[styles.insightRow, { backgroundColor: st.color + "18" }]}>
                      <Ionicons name={st.icon} size={18} color={st.color} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.insightTitle, { color: colors.text }]}>{ins.title}</Text>
                        <Text style={[styles.insightSub, { color: colors.subText }]}>{ins.subtitle}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  headerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 18,
    marginTop: 40,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: { fontSize: 19, fontWeight: "800", marginBottom: 4 },
  headerSubtitle: { fontSize: 12 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  filterRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  filterBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: TEAL,
    backgroundColor: TEAL + "18",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterText: { fontSize: 13, color: TEAL, fontWeight: "600" },
  exportBtn: {
    backgroundColor: TEAL,
    borderRadius: 8,
    paddingHorizontal: 18,
    minWidth: 92,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  exportText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  periodList: { borderWidth: 1, borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  periodItem: { paddingHorizontal: 14, paddingVertical: 12 },

  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  centerText: { fontSize: 13 },
  errorCard: {
    alignItems: "center",
    gap: 12,
    padding: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: NAVY,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  inlineError: { color: "#E11D48", fontSize: 12, marginBottom: 10 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
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
  badge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  statValue: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, lineHeight: 15 },

  chartCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: "800", marginBottom: 12 },

  pieLegend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 6 },
  pieLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  pieDot: { width: 8, height: 8, borderRadius: 4 },
  pieLegendText: { fontSize: 11 },

  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  insightTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  insightSub: { fontSize: 11, lineHeight: 16 },
});
