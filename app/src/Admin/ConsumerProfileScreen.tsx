import React from "react";
import {
  Dimensions,
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
import { mockCases } from "../../../data/mockData";
import { Consumer } from "../../../types";
import { useAppSettings } from "../../../hooks/AppSettingContext";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 120;

interface Props {
  navigation: any;
  route: { params: { consumer: Consumer } };
}

const MiniLineChart = ({
  data,
  color,
}: {
  data: { date: string; value: number }[];
  color: string;
}) => {
  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;
  const getY = (v: number) =>
    CHART_HEIGHT - ((v - minVal) / range) * (CHART_HEIGHT - 20) - 10;
  const getX = (i: number) => (i / (data.length - 1)) * (CHART_WIDTH - 20) + 10;

  return (
    <View style={{ height: CHART_HEIGHT }}>
      <View style={StyleSheet.absoluteFill}>
        {data.map((d, i) => {
          if (i === 0) return null;
          const x1 = getX(i - 1),
            y1 = getY(data[i - 1].value);
          const x2 = getX(i),
            y2 = getY(d.value);
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View
              key={i}
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
              {
                left: getX(i) - 4,
                top: getY(d.value) - 4,
                backgroundColor: color,
              },
            ]}
          />
        ))}
      </View>
      <View style={[styles.xLabels, { top: CHART_HEIGHT - 2 }]}>
        {data.map((d, i) => (
          <Text key={i} style={styles.xLabel}>
            {d.date}
          </Text>
        ))}
      </View>
    </View>
  );
};

const severityColor = (s: string) => {
  if (s === "High") return Colors.danger;
  if (s === "Medium") return Colors.warning;
  return Colors.primary;
};

export default function ConsumerProfileScreen({ navigation, route }: Props) {
  const { colors } = useAppSettings();
  const { consumer } = route.params;
  const riskColor = getRiskColor(consumer.riskLevel);
  const consumerCases = mockCases.filter((c) => c.consumerId === consumer.id);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
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
            <Text style={styles.consumerName}>{consumer.name}</Text>
            <Text style={styles.consumerMeta}>
              {consumer.id} • {consumer.meterNumber}
            </Text>
          </View>
          <View
            style={[
              styles.riskBadge,
              {
                backgroundColor: riskColor + "15",
                borderColor: riskColor + "40",
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>
              {consumer.riskLevel} Risk
            </Text>
          </View>
        </View>

        {/* Consumer Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consumer Profile</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileIcon}>📍</Text>
            <View>
              <Text style={styles.profileLabel}>Address</Text>
              <Text style={styles.profileValue}>{consumer.address}</Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileIcon}>📞</Text>
            <View>
              <Text style={styles.profileLabel}>Contact</Text>
              <Text style={styles.profileValue}>{consumer.phone}</Text>
            </View>
          </View>
          <View style={styles.profileMeta}>
            <View>
              <Text style={styles.profileLabel}>Last Reading</Text>
              <Text style={styles.profileValue}>{consumer.lastReading}</Text>
            </View>
            <View>
              <Text style={styles.profileLabel}>Status</Text>
              <Text
                style={[
                  styles.profileValue,
                  {
                    color:
                      consumer.status === "Active"
                        ? Colors.success
                        : Colors.danger,
                  },
                ]}
              >
                {consumer.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Risk Analysis */}
        <View style={styles.card}>
          <View style={styles.riskAnalysisHeader}>
            <Text style={styles.cardTitle}>Risk Analysis</Text>
            <Text style={[styles.riskPct, { color: riskColor }]}>
              {consumer.riskScore}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${consumer.riskScore}%`, backgroundColor: riskColor },
              ]}
            />
          </View>
        </View>

        {/* Consumption History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consumption History</Text>
          <MiniLineChart
            data={consumer.consumptionHistory}
            color={Colors.primary}
          />
        </View>

        {/* Theft Flags */}
        {consumer.theftFlags.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Theft Flags</Text>
            {consumer.theftFlags.map((flag, i) => (
              <View key={i} style={styles.flagRow}>
                <Text
                  style={[
                    styles.flagIcon,
                    { color: severityColor(flag.severity) },
                  ]}
                >
                  ⚠
                </Text>
                <View>
                  <Text style={styles.flagType}>{flag.type}</Text>
                  <Text style={styles.flagDate}>
                    {flag.date} •{" "}
                    <Text style={{ color: severityColor(flag.severity) }}>
                      {flag.severity} Severity
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Case History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case History</Text>
          {consumerCases.length === 0 ? (
            <Text style={styles.noCases}>No cases filed</Text>
          ) : (
            consumerCases.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.caseRow}
                onPress={() =>
                  navigation.navigate("CaseProfile", { caseItem: c })
                }
              >
                <View>
                  <Text style={styles.caseNumber}>{c.caseNumber}</Text>
                  <Text style={styles.caseDesc} numberOfLines={1}>
                    {c.description}
                  </Text>
                  <Text style={styles.caseDate}>{c.createdAt}</Text>
                </View>
                <View
                  style={[
                    styles.caseBadge,
                    { backgroundColor: getCaseStatusColor(c.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.caseBadgeText,
                      { color: getCaseStatusColor(c.status) },
                    ]}
                  >
                    {c.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => navigation.navigate("Cases")}
          >
            <Text style={styles.actionBtnText}>📋 Create Case</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.teal }]}
          >
            <Text style={styles.actionBtnText}>📞 Contact</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 16,
    margin: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  headerInfo: { flex: 1 },
  consumerName: { fontSize: 18, fontWeight: "700", color: Colors.text },
  consumerMeta: { fontSize: 12, color: Colors.textSecondary },
  riskBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText: { fontSize: 11, fontWeight: "600" },
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
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  profileIcon: { fontSize: 18, marginTop: 2 },
  profileLabel: { fontSize: 11, color: Colors.textSecondary },
  profileValue: { fontSize: 14, fontWeight: "500", color: Colors.text },
  profileMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  riskAnalysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  riskPct: { fontSize: 18, fontWeight: "700" },
  progressBar: {
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 6 },
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
  xLabels: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xLabel: { fontSize: 8, color: Colors.textSecondary },
  flagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  flagIcon: { fontSize: 18, marginTop: 2 },
  flagType: { fontSize: 14, fontWeight: "600", color: Colors.text },
  flagDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  noCases: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    padding: 16,
  },
  caseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  caseNumber: { fontSize: 14, fontWeight: "700", color: Colors.text },
  caseDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: width - 140,
  },
  caseDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
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
