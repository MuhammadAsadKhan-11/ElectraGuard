// app/src/Consumer/NotificationsScreen.tsx
// ProfileScreen ke "Notifications" row par tap karne se yeh screen khulti hai.
// Yahan wo saari notifications aati hain jo Admin ne case create/close/escalate
// karte waqt is consumer ko bheji hain.
import { Ionicons } from "@expo/vector-icons";
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
import { Colors } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import { MyNotification, useMyNotifications } from "../../../hooks/useMyNotifications";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  case_filed: "document-text-outline",
  case_closed: "checkmark-circle-outline",
  case_escalated: "alert-circle-outline",
  alert: "notifications-outline",
};

function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return dateStr;
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, t, language } = useAppSettings();
  const S = getStrings(language).consumerNotifications;
  const { items, unread, loaded, error, refresh, refreshing, markRead, markAllRead } =
    useMyNotifications();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const shown = tab === "unread" ? items.filter((n) => !n.read) : items;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/src/Consumer/ProfileScreen" as any));

  const openItem = (n: MyNotification) => {
    if (!n.read) markRead([n.id]);
    // Case ke baare mein hai to consumer ko sirf status dikha dete hain — case ka
    // internal detail admin-only hai, consumer yahi notification card mein dekh leta hai.
  };

  const renderItem = ({ item: n }: { item: MyNotification }) => (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: colors.card },
        !n.read && styles.itemUnread,
      ]}
      onPress={() => openItem(n)}
      activeOpacity={0.8}
    >
      <Ionicons name={ICONS[n.type] ?? "notifications-outline"} size={22} color={Colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.itemTitle, { color: colors.text, fontWeight: n.read ? "600" : "800" }]}
            numberOfLines={2}
          >
            {n.title}
          </Text>
          {!n.read && <View style={styles.dot} />}
        </View>
        {!!n.message && (
          <Text style={[styles.itemMsg, { color: colors.subText }]} numberOfLines={3}>
            {n.message}
          </Text>
        )}
        <Text style={[styles.itemTime, { color: colors.subText }]}>{timeAgo(n.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.notifications ?? S.title}</Text>
          <Text style={[styles.headerSub, { color: colors.subText }]}>
            {unread > 0 ? S.unread(unread) : S.allCaughtUp}
          </Text>
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={unread === 0} style={[styles.markAllBtn, unread === 0 && { opacity: 0.4 }]}>
          <Text style={styles.markAllText}>{S.markAllRead}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(["all", "unread"] as const).map((tKey) => (
          <TouchableOpacity
            key={tKey}
            style={[styles.tabBtn, { backgroundColor: colors.card, borderColor: colors.border }, tab === tKey && styles.tabBtnActive]}
            onPress={() => setTab(tKey)}
          >
            <Text style={[styles.tabText, { color: colors.subText }, tab === tKey && styles.tabTextActive]}>
              {tKey === "all" ? S.all : S.unreadTab(unread)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {error ? S.loadFailed : tab === "unread" ? S.noUnread : S.noneYet}
              </Text>
              {!!error && (
                <TouchableOpacity style={styles.retryBtn} onPress={() => refresh()}>
                  <Text style={styles.retryText}>{S.retry}</Text>
                </TouchableOpacity>
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
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  markAllBtn: { backgroundColor: Colors.primary + "15", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  tabs: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 10, flexGrow: 1 },
  item: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemUnread: { shadowOpacity: 0.12, elevation: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemTitle: { flex: 1, fontSize: 14 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: Colors.primary },
  itemMsg: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  itemTime: { fontSize: 11, marginTop: 6 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: "700" },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 12 },
  retryText: { color: "#fff", fontWeight: "700" },
});
