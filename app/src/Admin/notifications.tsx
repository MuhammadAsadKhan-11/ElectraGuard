// app/src/Admin/notifications.tsx
// Bell icon dabane par yeh screen khulti hai: consumers ke cases/queries + theft alerts (LIVE).
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { palette, timeAgo } from "../../../constants/adminUi";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { AppNotification, useNotifications } from "../../../hooks/useAdminApi";

type Tab = "all" | "unread";

const ICONS: Record<string, string> = {
  case_filed: "📋",
  case_escalated: "🚨",
  case_resolved: "✅",
  theft_detected: "⚠️",
  query: "💬",
  alert: "🔔",
};

const severityColor = (s: string): string => {
  if (s === "high") return palette.danger;
  if (s === "medium") return palette.warning;
  if (s === "low") return palette.success;
  return palette.accent;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useAppSettings();
  const { items, unread, loaded, error, refresh, markRead, markAllRead } =
    useNotifications();

  const [tab, setTab] = useState<Tab>("all");
  const [refreshing, setRefreshing] = useState(false);

  const shown = tab === "unread" ? items.filter((n) => !n.read) : items;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/src/Admin/DashboardScreen" as any);
  };

  const openItem = (n: AppNotification) => {
    if (!n.read) markRead([n.id]);
    if (n.consumerKey) {
      router.push({
        pathname: "/src/Admin/ConsumerProfileScreen",
        params: { id: n.consumerKey },
      } as any);
    }
  };

  const renderItem = ({ item: n }: { item: AppNotification }) => {
    const color = severityColor(n.severity);
    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: colors.card, borderLeftColor: color },
          !n.read && styles.itemUnread,
        ]}
        onPress={() => openItem(n)}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{ICONS[n.type] ?? "🔔"}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.itemTitle,
                { color: colors.text, fontWeight: n.read ? "600" : "800" },
              ]}
              numberOfLines={2}
            >
              {n.title}
            </Text>
            {!n.read && <View style={[styles.dot, { backgroundColor: color }]} />}
          </View>
          {!!n.message && (
            <Text style={[styles.itemMsg, { color: colors.subText }]} numberOfLines={3}>
              {n.message}
            </Text>
          )}
          <Text style={[styles.itemTime, { color: colors.subText }]}>
            {timeAgo(n.createdAt)}
            {n.consumerKey ? "  •  Tap to open profile" : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          <Text style={[styles.headerSub, { color: colors.subText }]}>
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={markAllRead}
          disabled={unread === 0}
          style={[styles.markAllBtn, unread === 0 && { opacity: 0.4 }]}
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["all", "unread"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tabBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              tab === t && styles.tabBtnActive,
            ]}
            onPress={() => setTab(t)}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.subText },
                tab === t && styles.tabTextActive,
              ]}
            >
              {t === "all" ? "All" : `Unread${unread > 0 ? ` (${unread})` : ""}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {error
                  ? "Notifications load nahi ho sakin"
                  : tab === "unread"
                    ? "Koi unread notification nahi"
                    : "Abhi koi notification nahi"}
              </Text>
              {!!error && (
                <>
                  <Text style={[styles.emptyDetail, { color: colors.subText }]}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    margin: 16,
    marginTop: 40,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 6 },
  backArrow: { fontSize: 22, color: palette.primary, fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  markAllBtn: {
    backgroundColor: palette.primary + "15",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllText: { color: palette.primary, fontSize: 12, fontWeight: "700" },

  tabs: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 10, flexGrow: 1 },
  item: {
    flexDirection: "row",
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemUnread: { shadowOpacity: 0.12, elevation: 4 },
  icon: { fontSize: 22, marginTop: 2 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemTitle: { flex: 1, fontSize: 14 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  itemMsg: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  itemTime: { fontSize: 11, marginTop: 6 },

  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: "700" },
  emptyDetail: { fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 12 },
  retryBtn: {
    backgroundColor: palette.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
