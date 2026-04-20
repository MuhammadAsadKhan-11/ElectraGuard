import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  collection, doc, onSnapshot, orderBy,
  query, updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { db } from '../../firebaseConfig';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  consumerName?: string;
  consumerId?: string;
  riskLevel: 'High' | 'Medium' | 'Low' | 'Info';
  status: 'unread' | 'read';
  timestamp: any;
  type: 'theft' | 'system' | 'registration' | 'resolved';
}

export default function AdminAlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'adminAlerts'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: AlertItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data() as Omit<AlertItem, 'id'>,
      }));
      setAlerts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'adminAlerts', id), { status: 'read' });
  };

  const markAllRead = async () => {
    const unread = alerts.filter((a) => a.status === 'unread');
    await Promise.all(
      unread.map((a) => updateDoc(doc(db, 'adminAlerts', a.id), { status: 'read' }))
    );
  };

  const getAlertIcon = (type: string, level: string) => {
    if (type === 'theft') return { name: 'warning', color: '#DC2626' };
    if (type === 'resolved') return { name: 'checkmark-circle', color: '#059669' };
    if (type === 'registration') return { name: 'person-add', color: '#0B3C5D' };
    if (level === 'High') return { name: 'alert-circle', color: '#DC2626' };
    if (level === 'Medium') return { name: 'alert', color: '#D97706' };
    return { name: 'information-circle', color: '#0B3C5D' };
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  const unreadCount = alerts.filter((a) => a.status === 'unread').length;

  const renderItem = ({ item }: { item: AlertItem }) => {
    const iconInfo = getAlertIcon(item.type, item.riskLevel);
    return (
      <TouchableOpacity
        style={[styles.alertCard, item.status === 'unread' && styles.alertCardUnread]}
        onPress={() => {
          markAsRead(item.id);
          if (item.consumerId) {
            // Navigate to risk screen with consumer id
            router.push({
              pathname: '/Admin/AdminriskScreen' as any,
              params: { id: item.id },
            });
          }
        }}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconInfo.color + '15' }]}>
          <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertTitleRow}>
            <Text style={styles.alertTitle} numberOfLines={1}>{item.title}</Text>
            {item.status === 'unread' && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.alertMessage} numberOfLines={2}>{item.message}</Text>
          {item.consumerName && (
            <Text style={styles.alertConsumer}>Consumer: {item.consumerName}</Text>
          )}
          <Text style={styles.alertTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0B3C5D" />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No alerts yet</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#0B3C5D', paddingTop: 50, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  markAllText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#FFFFFF' },
  alertCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 12, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  alertCardUnread: { borderLeftWidth: 3, borderLeftColor: '#0B3C5D' },
  iconWrapper: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  alertContent: { flex: 1 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  alertTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#1F2933', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0B3C5D' },
  alertMessage: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280',
    lineHeight: 18, marginBottom: 4,
  },
  alertConsumer: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#0B3C5D' },
  alertTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
});