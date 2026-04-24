import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../firebaseConfig';

const Colors = {
  primary: '#0B3C5D',
  accent: '#007AFF',
  danger: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  bg: '#F2F2F7',
  white: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
};

// ── Types ────────────────────────────────────────────────────────────────────
type NotifType = 'new_case' | 'case_resolved' | 'inspection' | 'other';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const GROUP_CONFIG: Record<NotifType, { label: string; color: string; icon: string }> = {
  new_case:      { label: 'New Cases',      color: Colors.danger,  icon: '📋' },
  case_resolved: { label: 'Cases Resolved', color: Colors.success, icon: '✅' },
  inspection:    { label: 'Inspections',    color: Colors.warning, icon: '🔍' },
  other:         { label: 'General',        color: Colors.accent,  icon: '🔔' },
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Notification Card ─────────────────────────────────────────────────────────
const NotifCard = ({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string) => void;
}) => {
  const cfg = GROUP_CONFIG[notif.type];
  return (
    <TouchableOpacity
      style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
      onPress={() => onRead(notif.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.notifIconBox, { backgroundColor: cfg.color + '18' }]}>
        <Text style={styles.notifEmoji}>{cfg.icon}</Text>
      </View>
      <View style={styles.notifBody}>
        <Text style={styles.notifTitle}>{notif.title}</Text>
        <Text style={styles.notifText} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.notifTime}>{timeAgo(notif.createdAt)}</Text>
      </View>
      {!notif.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Firebase realtime listener ──
  useEffect(() => {
    const q = query(
      collection(db, 'adminNotifications'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: Notification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Notification, 'id'>),
      }));
      setNotifications(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ── Mark as read ──
  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'adminNotifications', id), { read: true });
    } catch (e) {
      console.error('markRead error:', e);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markRead(n.id)));
  };

  // ── Group notifications ──
  const groups = (Object.keys(GROUP_CONFIG) as NotifType[]).reduce<
    Record<NotifType, Notification[]>
  >(
    (acc, key) => {
      acc[key] = notifications.filter((n) => n.type === key);
      return acc;
    },
    { new_case: [], case_resolved: [], inspection: [], other: [] }
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>New cases, inspections and updates will appear here.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {(Object.keys(GROUP_CONFIG) as NotifType[]).map((type) => {
            const group = groups[type];
            if (group.length === 0) return null;
            const cfg = GROUP_CONFIG[type];
            return (
              <View key={type} style={styles.group}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <View style={[styles.groupDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.groupTitle, { color: cfg.color }]}>{cfg.label}</Text>
                  <View style={[styles.groupCount, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={[styles.groupCountText, { color: cfg.color }]}>{group.length}</Text>
                  </View>
                </View>

                {/* Cards */}
                {group.map((notif) => (
                  <NotifCard key={notif.id} notif={notif} onRead={markRead} />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, width: 36 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  headerBadge: {
    backgroundColor: Colors.danger, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  // Loading / Empty
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Group
  group: { marginTop: 20, paddingHorizontal: 16 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  groupCount: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  groupCountText: { fontSize: 11, fontWeight: '700' },

  // Notification card
  notifCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  notifCardUnread: {
    borderLeftWidth: 3, borderLeftColor: Colors.accent,
  },
  notifIconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  notifEmoji: { fontSize: 20 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  notifText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, marginTop: 4,
  },
});