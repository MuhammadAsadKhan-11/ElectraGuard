// app/src/Admin/AlertsScreen.tsx
// System Alerts — data from FastAPI (GET /alerts).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
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
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { AlertSeverity, useAlerts } from "../../../hooks/useAlertsApi";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const NAVY = "#0B3C5D";

const SEVERITY_STYLE: Record<AlertSeverity, { icon: IoniconsName; color: string }> = {
  critical: { icon: "warning-outline", color: "#E11D48" },
  warning: { icon: "alert-circle-outline", color: "#F59E0B" },
  info: { icon: "information-circle-outline", color: "#1CA7A6" },
};

const timeAgo = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

export default function AlertsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useAppSettings();
  const { alerts, activeCount, loading, refreshing, error, reload, pullRefresh } = useAlerts();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/src/Admin/ReportsScreen" as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      {/* Header: back arrow + title */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={24} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>System Alerts</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {activeCount} active notification{activeCount === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullRefresh} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={[styles.centerText, { color: colors.subText }]}>Loading alerts...</Text>
          </View>
        ) : error && alerts.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.subText} />
            <Text style={[styles.centerText, { color: colors.subText, textAlign: "center" }]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reload}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="checkmark-circle-outline" size={34} color="#1CA7A6" />
            <Text style={[styles.centerText, { color: colors.subText }]}>No active alerts</Text>
          </View>
        ) : (
          alerts.map((a) => {
            const st = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.info;
            return (
              <View
                key={a.id}
                style={[
                  styles.card,
                  { backgroundColor: st.color + "14", borderColor: st.color + "66" },
                ]}
              >
                <Ionicons name={st.icon} size={18} color={st.color} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{a.title}</Text>
                  <Text style={[styles.cardMsg, { color: colors.subText }]}>{a.message}</Text>
                </View>
                <Text style={[styles.cardTime, { color: colors.subText }]}>{timeAgo(a.createdAt)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 44,
    paddingBottom: 18,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 4 },

  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  cardMsg: { fontSize: 12, lineHeight: 17 },
  cardTime: { fontSize: 10, marginLeft: 4 },

  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  centerText: { fontSize: 13 },
  retryBtn: {
    backgroundColor: NAVY,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
