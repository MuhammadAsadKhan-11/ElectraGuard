// AlertsScreen.tsx
// ─────────────────────────────────────────────────────────────
// ElectraGuard — System Alerts Screen (TypeScript)
// Firebase "systemAlerts" collection se data dynamically fetch karta hai
// ─────────────────────────────────────────────────────────────

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
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
import { db } from "../../../firebaseConfig";
import { useAppSettings } from "../../../hooks/AppSettingContext";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type AlertSeverity = "high" | "medium" | "low" | "info";

interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity; // "high" | "medium" | "low" | "info"
  timeLabel: string; // e.g. "2 mins ago"
  createdAt: number; // timestamp for ordering
}

// ─────────────────────────────────────────────────────────────
// SEVERITY CONFIG
// ─────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    icon: IoniconsName;
  }
> = {
  high: {
    bg: "#FFF5F5",
    border: "#FECACA",
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    icon: "warning-outline",
  },
  medium: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    icon: "alert-circle-outline",
  },
  low: {
    bg: "#F0FFF4",
    border: "#BBF7D0",
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    icon: "information-circle-outline",
  },
  info: {
    bg: "#F0FDFA",
    border: "#99F6E4",
    iconBg: "#CCFBF1",
    iconColor: "#0D9488",
    icon: "information-circle-outline",
  },
};

// ─────────────────────────────────────────────────────────────
// ALERT CARD COMPONENT
// ─────────────────────────────────────────────────────────────
const AlertCard: React.FC<{ alert: SystemAlert }> = ({ alert }) => {
  const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;

  return (
    <View
      style={[
        styles.alertCard,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      {/* Left icon */}
      <View style={[styles.alertIconBox, { backgroundColor: config.iconBg }]}>
        <Ionicons name={config.icon} size={18} color={config.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle} numberOfLines={1}>
          {alert.title}
        </Text>
        <Text style={styles.alertDesc} numberOfLines={2}>
          {alert.description}
        </Text>
      </View>

      {/* Time */}
      <Text style={styles.alertTime}>{alert.timeLabel}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// SEED DATA — Firebase mein pehli baar data dalne ke liye
// ─────────────────────────────────────────────────────────────
const SEED_ALERTS: Omit<SystemAlert, "id">[] = [
  {
    title: "High Anomaly Detected",
    description: "Consumer C-10234567 showing 92% anomaly score in Sector G-10",
    severity: "high",
    timeLabel: "2 mins ago",
    createdAt: Date.now() - 2 * 60 * 1000,
  },
  {
    title: "Data Ingestion Delay",
    description:
      "Delayed data sync from Area DHA Phase 6 - Last update 45 mins ago",
    severity: "medium",
    timeLabel: "15 mins ago",
    createdAt: Date.now() - 15 * 60 * 1000,
  },
  {
    title: "Multiple Theft Cases",
    description: "3 new theft cases opened in Gulberg III area today",
    severity: "high",
    timeLabel: "1 hour ago",
    createdAt: Date.now() - 60 * 60 * 1000,
  },
  {
    title: "System Maintenance",
    description: "Scheduled maintenance on Feb 10, 2026 from 2 AM - 4 AM",
    severity: "info",
    timeLabel: "2 hours ago",
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
];

async function seedAlertsData() {
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    for (let i = 0; i < SEED_ALERTS.length; i++) {
      const alert = SEED_ALERTS[i];
      await setDoc(doc(db, "systemAlerts", `alert_${i + 1}`), alert);
    }
    console.log("systemAlerts seeded successfully.");
  } catch (err) {
    console.error("Seed error:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function AlertsScreen(): React.ReactElement {
  const { colors } = useAppSettings();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch from Firebase (real-time listener) ──────────────
  useEffect(() => {
    setError(null);
    const q = query(
      collection(db, "systemAlerts"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // Seed default data if collection is empty
          console.log("Seeding systemAlerts...");
          await seedAlertsData();
        } else {
          const data: SystemAlert[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SystemAlert, "id">),
          }));
          setAlerts(data);
          setLoading(false);
          setRefreshing(false);
        }
      },
      (err) => {
        console.error("Alerts fetch error:", err);
        setError("Alerts load nahi ho sake.");
        setLoading(false);
        setRefreshing(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // onSnapshot will auto-update; just reset refreshing after short delay
    setTimeout(() => setRefreshing(false), 800);
  };

  // ── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0B3C5D" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  // ── Error State ───────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={48} color="#D1D5DB" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0B3C5D"
          />
        }
      >
        {/* ── Header Card ── */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#0B3C5D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {alerts.length} active notification{alerts.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* ── Alerts List ── */}
        <View style={styles.alertsList}>
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color="#A3E4D7"
              />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>
                No active alerts at the moment.
              </Text>
            </View>
          ) : (
            alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F0F4F8" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Center states
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
    gap: 12,
  },
  loadingText: { color: "#718096", fontSize: 14 },
  errorText: {
    color: "#718096",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: "#0B3C5D",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  // Header
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 40,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A202C",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // Alerts list
  alertsList: {
    gap: 10,
  },

  // Alert card
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 3,
  },
  alertDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  alertTime: {
    fontSize: 10,
    color: "#9CA3AF",
    flexShrink: 0,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A202C",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
