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
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StackBar } from "../../../components/AppChrome";
import { Colors } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import { MyNotification, useMyNotifications } from "../../../hooks/useMyNotifications";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  case_filed: "document-text-outline",
  case_created: "document-text-outline",
  case_assigned: "person-outline",
  case_status_changed: "sync-outline",
  evidence_uploaded: "attach-outline",
  case_remark: "chatbox-ellipses-outline",
  admin_message: "megaphone-outline",
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
    router.push({ pathname: "/src/Consumer/NotificationDetailScreen", params: { id: n.id } } as any);
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
        <View style={styles.metaRow}>
          <Text style={[styles.itemTime, { color: colors.subText }]}>
            {timeAgo(n.createdAt)}
            {n.caseId ? `  •  ${n.caseId}` : ""}
          </Text>
          {n.evidence?.length > 0 && (
            <View style={styles.attachPill}>
              <Ionicons name="attach-outline" size={12} color={Colors.primary} />
              <Text style={styles.attachText}>{n.evidence.length}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />
      <StackBar
        title={t.notifications ?? S.title}
        subtitle={unread > 0 ? S.unread(unread) : S.allCaughtUp}
        onBack={goBack}
        right={
          <TouchableOpacity onPress={markAllRead} disabled={unread === 0} style={{ opacity: unread === 0 ? 0.45 : 1 }}>
            <Text style={styles.markAllText}>{S.markAllRead}</Text>
          </TouchableOpacity>
        }
      />

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
          ListHeaderComponent={
            error && items.length > 0 ? (
              <Text style={styles.inlineError}>{error}</Text>
            ) : undefined
          }
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
    </View>
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
  markAllText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabs: { flexDirection: "row", paddingHorizontal: 16, marginTop: 14, marginBottom: 10, gap: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF" },
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
  itemTime: { fontSize: 11 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  attachPill: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: Colors.primary + "15", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  attachText: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: "700" },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  inlineError: { color: "#B91C1C", fontSize: 12, textAlign: "center", marginBottom: 6 },
});
