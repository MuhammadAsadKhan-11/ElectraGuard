// app/src/Admin/ConsumerProfileScreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  caseStatusColor,
  formatNumber,
  palette,
  riskColor,
  severityColor,
} from "../../../constants/adminUi";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import {
  ConsumerProfile,
  useApi,
  useLiveRefresh,
} from "../../../hooks/useAdminApi";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 120;

// DigiServe / support WhatsApp number — "Contact" button par yehi khulta hai
// (consumer ka apna number nahi, humara support number).
const SUPPORT_WHATSAPP_NUMBER = "923258568691"; // no "+", no leading 0

// ─── Line chart (consumption history) ────────────────────────
const MiniLineChart = ({
  data,
  color,
}: {
  data: { label: string; value: number }[];
  color: string;
}) => {
  const { colors, language } = useAppSettings();
  const S = getStrings(language).consumerProfileAdmin;

  if (data.length < 2) {
    return (
      <Text style={[styles.noData, { color: colors.subText }]}>
        {S.notEnoughData}
      </Text>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;
  const getY = (v: number) =>
    CHART_HEIGHT - ((v - minVal) / range) * (CHART_HEIGHT - 20) - 10;
  const getX = (i: number) => (i / (data.length - 1)) * (CHART_WIDTH - 40) + 20;

  return (
    <View style={{ height: CHART_HEIGHT + 18 }}>
      <View style={[styles.plotArea, { height: CHART_HEIGHT }]}>
        {data.map((d, i) => {
          if (i === 0) return null;
          const x1 = getX(i - 1);
          const y1 = getY(data[i - 1].value);
          const x2 = getX(i);
          const y2 = getY(d.value);
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View
              key={`l-${i}`}
              style={[
                styles.chartLine,
                {
                  left: x1,
                  top: y1,
                  width: len,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: color,
                },
              ]}
            />
          );
        })}
        {data.map((d, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.chartDot,
              { left: getX(i) - 4, top: getY(d.value) - 4, backgroundColor: color },
            ]}
          />
        ))}
      </View>
      {data.map((d, i) => (
        <Text
          key={`x-${i}`}
          style={[
            styles.xLabel,
            { left: getX(i) - 18, top: CHART_HEIGHT + 4, color: colors.subText },
          ]}
        >
          {d.label}
        </Text>
      ))}
    </View>
  );
};

// ─── Screen ──────────────────────────────────────────────────
export default function ConsumerProfileScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).consumerProfileAdmin;

  const params = useLocalSearchParams();
  const rawId = params.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const { data, loading, refreshing, error, reload, pullRefresh, retry } =
    useApi<ConsumerProfile>(id ? `/api/consumers/${encodeURIComponent(id)}` : null);
  useLiveRefresh(reload, !!id); // Firestore mai change => profile auto update

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/src/Admin/RisksScreen" as any);
  };

  // Component nahi, plain function: har render par remount nahi hota
  const renderHeader = (children?: React.ReactNode) => (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <TouchableOpacity onPress={goBack} style={styles.backBtn}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      {children}
    </View>
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
        {renderHeader()}
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
        {renderHeader()}
        <View style={styles.centerBox}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {S.loadFailed}
          </Text>
          {!!error && (
            <Text style={[styles.errorDetail, { color: colors.subText }]}>{error}</Text>
          )}
          <TouchableOpacity style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryText}>{S.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const consumer = data;
  const color = riskColor(consumer.riskLevel);

  // "Contact" — ab consumer ke apne number pe call karne ki jagah,
  // seedha support WhatsApp number (+92 325 8568691) khulta hai.
  const contactSupport = () => {
    const message = encodeURIComponent(
      `Regarding consumer ${consumer.name} (${consumer.consumerId})`,
    );
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${message}`).catch(() => {
      // Fallback agar WhatsApp installed na ho
      Linking.openURL(`https://api.whatsapp.com/send?phone=${SUPPORT_WHATSAPP_NUMBER}&text=${message}`);
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} />}
      >
        {/* Header */}
        {renderHeader(
          <>
          <View style={styles.headerInfo}>
            <Text style={[styles.consumerName, { color: colors.text }]}>
              {consumer.name}
            </Text>
            <Text style={[styles.consumerMeta, { color: colors.subText }]}>
              {[consumer.consumerId, consumer.meterNumber].filter(Boolean).join(" • ")}
            </Text>
          </View>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: color + "15", borderColor: color + "40", borderWidth: 1 },
            ]}
          >
            <Text style={[styles.riskBadgeText, { color }]}>{consumer.riskLevel} Risk</Text>
          </View>
          </>,
        )}

        {/* Consumer Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.consumerProfile}</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.address}</Text>
              <Text style={[styles.profileValue, { color: colors.text }]}>
                {consumer.address || consumer.location || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileIcon}>📞</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.contact}</Text>
              <Text style={[styles.profileValue, { color: colors.text }]}>
                {consumer.phone || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileIcon}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.email}</Text>
              <Text style={[styles.profileValue, { color: colors.text }]}>
                {consumer.email || "—"}
              </Text>
            </View>
          </View>
          <View style={[styles.profileMeta, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.prediction}</Text>
              <Text
                style={[
                  styles.profileValue,
                  { color: /theft/i.test(consumer.prediction) && !/no\s*theft/i.test(consumer.prediction) ? palette.danger : palette.success },
                ]}
              >
                {consumer.prediction}
              </Text>
            </View>
            <View>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.estimatedBill}</Text>
              <Text style={[styles.profileValue, { color: colors.text }]}>
                {consumer.estimatedBill > 0 ? `PKR ${formatNumber(consumer.estimatedBill)}` : "—"}
              </Text>
            </View>
          </View>
          <View style={[styles.profileMeta, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.lastReading}</Text>
              <Text style={[styles.profileValue, { color: colors.text }]}>
                {consumer.lastReading ?? "—"}
              </Text>
            </View>
            <View>
              <Text style={[styles.profileLabel, { color: colors.subText }]}>{S.status}</Text>
              <Text
                style={[
                  styles.profileValue,
                  { color: consumer.status === "Active" ? palette.success : palette.danger },
                ]}
              >
                {consumer.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Risk Analysis */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.riskAnalysisHeader}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
              {S.riskAnalysis}
            </Text>
            <Text style={[styles.riskPct, { color }]}>{consumer.riskScore}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${consumer.riskScore}%`, backgroundColor: color },
              ]}
            />
          </View>
        </View>

        {/* Consumption History */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.consumptionHistory}</Text>
          <MiniLineChart data={consumer.consumptionHistory} color={palette.accent} />
        </View>

        {/* Theft Flags */}
        {consumer.theftFlags.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{S.theftFlags}</Text>
            {consumer.theftFlags.map((flag, i) => (
              <View key={`${flag.type}-${i}`} style={styles.flagRow}>
                <Text style={[styles.flagIcon, { color: severityColor(flag.severity) }]}>⚠</Text>
                <View>
                  <Text style={[styles.flagType, { color: colors.text }]}>{flag.type}</Text>
                  <Text style={[styles.flagDate, { color: colors.subText }]}>
                    {flag.date} •{" "}
                    <Text style={{ color: severityColor(flag.severity) }}>
                      {flag.severity} {S.severity}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Case History */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.caseHistory}</Text>
          {consumer.cases.length === 0 ? (
            <Text style={[styles.noData, { color: colors.subText }]}>{S.noCasesFiled}</Text>
          ) : (
            consumer.cases.map((c) => {
              const statusColor = caseStatusColor(c.status);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.caseRow, { borderBottomColor: colors.border }]}
                  onPress={() =>
                    router.push({
                      pathname: "/src/Admin/CaseProfileScreen",
                      params: { caseId: c.id },
                    } as any)
                  }
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.caseNumber, { color: colors.text }]}>
                      {c.caseNumber}
                    </Text>
                    <Text
                      style={[styles.caseDesc, { color: colors.subText }]}
                      numberOfLines={1}
                    >
                      {c.description}
                    </Text>
                    <Text style={[styles.caseDate, { color: colors.subText }]}>
                      {c.createdAt}
                    </Text>
                  </View>
                  <View style={[styles.caseBadge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={[styles.caseBadgeText, { color: statusColor }]}>
                      {c.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.danger }]}
            onPress={() =>
              router.push({
                pathname: "/src/Admin/createCaseScreen",
                params: { consumerId: consumer.consumerId, consumerName: consumer.name },
              } as any)
            }
          >
            <Text style={styles.actionBtnText}>{S.createCase}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.teal }]}
            onPress={contactSupport}
          >
            <Text style={styles.actionBtnText}>{S.contactBtn}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 30,
    margin: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backArrow: { fontSize: 22, color: palette.primary, fontWeight: "600" },
  headerInfo: { flex: 1 },
  consumerName: { fontSize: 18, fontWeight: "700" },
  consumerMeta: { fontSize: 12 },
  riskBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText: { fontSize: 11, fontWeight: "600" },

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

  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  profileIcon: { fontSize: 18, marginTop: 2 },
  profileLabel: { fontSize: 11 },
  profileValue: { fontSize: 14, fontWeight: "500" },
  profileMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  riskAnalysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  riskPct: { fontSize: 18, fontWeight: "700" },
  progressBar: { height: 12, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6 },

  plotArea: { position: "absolute", left: 0, right: 0, top: 0 },
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
    fontSize: 8,
  },

  flagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  flagIcon: { fontSize: 18, marginTop: 2 },
  flagType: { fontSize: 14, fontWeight: "600" },
  flagDate: { fontSize: 12, marginTop: 2 },
  noData: { fontSize: 14, textAlign: "center", padding: 16 },
  caseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  caseNumber: { fontSize: 14, fontWeight: "700" },
  caseDesc: { fontSize: 12, marginTop: 2 },
  caseDate: { fontSize: 11, marginTop: 2 },
  caseBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  caseBadgeText: { fontSize: 11, fontWeight: "600" },
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
});
