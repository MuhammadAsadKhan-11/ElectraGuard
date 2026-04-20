import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { db } from '../../firebaseConfig';

type RiskLevel = 'High' | 'Medium' | 'Low';

interface RiskConsumer {
  id: string;
  consumerName: string;
  consumerId: string;
  riskLevel: RiskLevel;
  reason: string;
  units: number;
  address?: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
}

const RISK_FILTERS: (RiskLevel | 'All')[] = ['All', 'High', 'Medium', 'Low'];

export default function AdminRisksScreen() {
  const [consumers, setConsumers] = useState<RiskConsumer[]>([]);
  const [filtered, setFiltered] = useState<RiskConsumer[]>([]);
  const [activeFilter, setActiveFilter] = useState<RiskLevel | 'All'>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: RiskConsumer[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data() as Omit<RiskConsumer, 'id'>,
      }));
      setConsumers(items);
      setFiltered(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = consumers;
    if (activeFilter !== 'All') result = result.filter((c) => c.riskLevel === activeFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.consumerName?.toLowerCase().includes(s) ||
          c.consumerId?.toLowerCase().includes(s) ||
          c.reason?.toLowerCase().includes(s)
      );
    }
    setFiltered(result);
  }, [activeFilter, search, consumers]);

  const getRiskColor = (level: RiskLevel) => {
    if (level === 'High') return '#DC2626';
    if (level === 'Medium') return '#D97706';
    return '#059669';
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return '#DC2626';
    if (status === 'investigating') return '#D97706';
    return '#059669';
  };

  const renderItem = ({ item }: { item: RiskConsumer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        // Navigate back to dashboard with item details if needed
        router.push('/Admin/AdminDashBoard' as any)
      }
    >
      <View style={styles.cardHeader}>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.riskLevel) + '15' }]}>
          <View style={[styles.riskDot, { backgroundColor: getRiskColor(item.riskLevel) }]} />
          <Text style={[styles.riskText, { color: getRiskColor(item.riskLevel) }]}>
            {item.riskLevel} Risk
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.consumerName}>{item.consumerName || 'Unknown'}</Text>
      <Text style={styles.consumerId}>ID: {item.consumerId}</Text>

      <View style={styles.cardRow}>
        <Ionicons name="alert-circle-outline" size={13} color="#6B7280" />
        <Text style={styles.reason}>{item.reason || 'Abnormal usage detected'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.cardStat}>
          <Ionicons name="flash-outline" size={13} color="#0B3C5D" />
          <Text style={styles.cardStatText}>{item.units || 0} kWh</Text>
        </View>
        {item.address && (
          <View style={styles.cardStat}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.cardStatText}>{item.address}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>High Risk Consumers</Text>
        <TouchableOpacity onPress={() => alert('Export coming soon!')}>
          <Ionicons name="download-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID or reason..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {RISK_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0B3C5D" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#059669" />
          <Text style={styles.emptyText}>No alerts found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
    justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4,
  },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterTabActive: { backgroundColor: '#0B3C5D', borderColor: '#0B3C5D' },
  filterText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  consumerName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#1F2933', marginBottom: 2 },
  consumerId: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  reason: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', flex: 1 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8,
  },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
});