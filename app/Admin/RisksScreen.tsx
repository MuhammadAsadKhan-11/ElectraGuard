import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, getRiskColor } from '../../constants/Colors';
import { mockConsumers, mockNotifications } from '../../data/mockData';
import { Consumer } from '../../types';

const { width } = Dimensions.get('window');

type FilterType = 'All Risks' | 'High Only' | 'Medium Only' | 'Blue Area';

interface Props {
  navigation: any;
}

const NotificationsModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const icons: Record<string, string> = {
    theft_detected: '⚠️',
    case_filed: '📋',
    case_resolved: '✅',
    report_filed: '📄',
  };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={mockNotifications}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.notifItem, !item.read && styles.notifUnread]}>
                <Text style={styles.notifIcon}>{icons[item.type]}</Text>
                <View style={styles.notifContent}>
                  <Text style={styles.notifMsg}>{item.message}</Text>
                  <Text style={styles.notifConsumer}>{item.consumer}</Text>
                  <Text style={styles.notifTime}>{item.timestamp}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const ConsumerCard = ({ consumer, onPress }: { consumer: Consumer; onPress: () => void }) => {
  const riskColor = getRiskColor(consumer.riskLevel);
  return (
    <TouchableOpacity style={styles.consumerCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTopRow}>
        <View style={styles.nameRow}>
          <Text style={styles.consumerName}>{consumer.name}</Text>
          {consumer.riskLevel === 'High' && <Text style={styles.fireIcon}>🔥</Text>}
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColor + '18', borderColor: riskColor + '40', borderWidth: 1 }]}>
          <Text style={[styles.riskBadgeText, { color: riskColor }]}>{consumer.riskLevel} Risk</Text>
        </View>
      </View>
      <Text style={styles.consumerMeta}>{consumer.id} • {consumer.meterNumber}</Text>
      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText}>{consumer.location}</Text>
      </View>
      <View style={styles.riskScoreRow}>
        <Text style={styles.riskScoreLabel}>Risk Score</Text>
        <Text style={[styles.riskScoreValue, { color: riskColor }]}>{consumer.riskScore}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${consumer.riskScore}%`, backgroundColor: riskColor }]} />
      </View>
      <View style={styles.consumptionRow}>
        <Text style={styles.consumptionText}>📈 Consumption  <Text style={styles.consumptionValue}>{consumer.consumption}kWh</Text></Text>
        <Text style={[styles.anomalyText, { color: riskColor }]}>+{consumer.anomaly}% anomaly</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function RisksScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterType>('All Risks');
  const [search, setSearch] = useState('');
  const [notifVisible, setNotifVisible] = useState(false);
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const filters: FilterType[] = ['All Risks', 'High Only', 'Medium Only', 'Blue Area'];

  const filtered = mockConsumers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.meterNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'High Only') return c.riskLevel === 'High';
    if (filter === 'Medium Only') return c.riskLevel === 'Medium';
    if (filter === 'Blue Area') return c.riskLevel === 'Normal' || c.riskLevel === 'Low';
    return true;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <NotificationsModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>High Risk Consumers</Text>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setNotifVisible(true)}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, name or area..."
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Consumer List */}
        <View style={styles.listContainer}>
          {filtered.map(c => (
            <ConsumerCard
              key={c.id}
              consumer={c}
              onPress={() => navigation.navigate('ConsumerProfile', { consumer: c })}
            />
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No consumers found</Text>
            </View>
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 16, backgroundColor: Colors.white,
    borderRadius: 16, margin: 16,marginTop: 40,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.danger, borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 12, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterScroll: { paddingHorizontal: 16, marginBottom: 14 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, marginRight: 8, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  listContainer: { paddingHorizontal: 16, gap: 12 },
  consumerCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  consumerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  fireIcon: { fontSize: 14 },
  riskBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText: { fontSize: 11, fontWeight: '600' },
  consumerMeta: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  locationIcon: { fontSize: 12, marginRight: 4 },
  locationText: { fontSize: 12, color: Colors.textSecondary },
  riskScoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  riskScoreLabel: { fontSize: 12, color: Colors.textSecondary },
  riskScoreValue: { fontSize: 13, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  consumptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  consumptionText: { fontSize: 12, color: Colors.textSecondary },
  consumptionValue: { fontWeight: '600', color: Colors.text },
  anomalyText: { fontSize: 12, fontWeight: '600' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  // Notification modal
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  notifModal: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 30,
  },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textSecondary, padding: 4 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifUnread: { backgroundColor: Colors.primary + '08' },
  notifIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  notifContent: { flex: 1 },
  notifMsg: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  notifConsumer: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  notifTime: { fontSize: 11, color: Colors.textSecondary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 },
});
