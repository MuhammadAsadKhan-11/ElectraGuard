import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  collection, getDocs, limit, onSnapshot,
  orderBy, query, where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { db } from '../../firebaseConfig';

const screenWidth = Dimensions.get('window').width;

interface KPIData {
  totalConsumers: number;
  activeAlerts: number;
  totalUnits: number;
  theftCases: number;
  resolvedCases: number;
  totalRevenue: number;
}

interface AlertItem {
  id: string;
  consumerName: string;
  consumerId: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  reason: string;
  units: number;
  timestamp: string;
}

export default function AdminDashboardScreen() {
  const [kpi, setKpi] = useState<KPIData>({
    totalConsumers: 0, activeAlerts: 0, totalUnits: 0,
    theftCases: 0, resolvedCases: 0, totalRevenue: 0,
  });
  const [highRiskAlerts, setHighRiskAlerts] = useState<AlertItem[]>([]);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const consumersUnsub = onSnapshot(collection(db, 'consumers'), (snap) => {
      setKpi((prev) => ({ ...prev, totalConsumers: snap.size }));
    });
    unsubscribes.push(consumersUnsub);

    const alertsUnsub = onSnapshot(
      query(collection(db, 'alerts'), where('status', '==', 'active')),
      (snap) => { setKpi((prev) => ({ ...prev, activeAlerts: snap.size })); }
    );
    unsubscribes.push(alertsUnsub);

    const theftUnsub = onSnapshot(
      query(collection(db, 'alerts'), where('riskLevel', '==', 'High')),
      (snap) => { setKpi((prev) => ({ ...prev, theftCases: snap.size })); }
    );
    unsubscribes.push(theftUnsub);

    const resolvedUnsub = onSnapshot(
      query(collection(db, 'alerts'), where('status', '==', 'resolved')),
      (snap) => { setKpi((prev) => ({ ...prev, resolvedCases: snap.size })); }
    );
    unsubscribes.push(resolvedUnsub);

    const highRiskUnsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('riskLevel', '==', 'High'),
        orderBy('timestamp', 'desc'),
        limit(10)
      ),
      (snap) => {
        const items: AlertItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data() as Omit<AlertItem, 'id'>,
        }));
        setHighRiskAlerts(items);
      }
    );
    unsubscribes.push(highRiskUnsub);

    fetchChartData();
    setLoading(false);

    return () => unsubscribes.forEach((u) => u());
  }, []);

  const fetchChartData = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'meterReadings'), orderBy('month', 'desc'), limit(7))
      );
      const values = snapshot.docs.map((d) => d.data().totalUnits || 0).reverse();
      if (values.length > 0) {
        setChartData(values.length >= 7 ? values : [...Array(7 - values.length).fill(0), ...values]);
      }
      const total = values.reduce((a, b) => a + b, 0);
      setKpi((prev) => ({ ...prev, totalUnits: total }));
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChartData();
    setRefreshing(false);
  };

  const getRiskColor = (level: string) => {
    if (level === 'High') return '#DC2626';
    if (level === 'Medium') return '#D97706';
    return '#059669';
  };

  const formatNumber = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `${(n / 1000).toFixed(1)}K`
    : n.toString();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B3C5D" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3C5D" />}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Admin Dashboard</Text>
          <Text style={styles.headerRole}>Admin User</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/Admin/AdminalertScreen' as any)}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {kpi.activeAlerts > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{kpi.activeAlerts > 9 ? '9+' : kpi.activeAlerts}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/Admin/AdminProfileScreen' as any)}
          >
            <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>

        {/* KPI Grid */}
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: '#0B3C5D' }]}>
            <Ionicons name="people-outline" size={22} color="#FFFFFF" />
            <Text style={styles.kpiValueLight}>{formatNumber(kpi.totalConsumers)}</Text>
            <Text style={styles.kpiLabelLight}>Total Consumers</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#FFFFFF' }]}>
            <Ionicons name="warning-outline" size={22} color="#DC2626" />
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{kpi.activeAlerts}</Text>
            <Text style={styles.kpiLabel}>Active Alerts</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#FFFFFF' }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={22} color="#0B3C5D" />
            <Text style={styles.kpiValue}>{formatNumber(kpi.totalUnits)}</Text>
            <Text style={styles.kpiLabel}>Total Units (kWh)</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#FFFFFF' }]}>
            <Ionicons name="shield-outline" size={22} color="#DC2626" />
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{kpi.theftCases}</Text>
            <Text style={styles.kpiLabel}>Theft Cases</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#FFFFFF' }]}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
            <Text style={[styles.kpiValue, { color: '#059669' }]}>{kpi.resolvedCases}</Text>
            <Text style={styles.kpiLabel}>Resolved Cases</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#0B3C5D' }]}>
            <Ionicons name="cash-outline" size={22} color="#FFFFFF" />
            <Text style={styles.kpiValueLight}>PKR {formatNumber(kpi.totalRevenue)}</Text>
            <Text style={styles.kpiLabelLight}>Revenue</Text>
          </View>
        </View>

        {/* Consumption Chart */}
        <Text style={styles.sectionTitle}>Consumption & Theft Analytics</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Total Consumption (kWh)</Text>
            <View style={styles.chartLegend}>
              <View style={[styles.legendDot, { backgroundColor: '#0B3C5D' }]} />
              <Text style={styles.legendText}>Last 7 Months</Text>
            </View>
          </View>
          <LineChart
            data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
              datasets: [{ data: chartData, color: () => '#0B3C5D', strokeWidth: 2 }],
            }}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(11, 60, 93, ${opacity})`,
              labelColor: () => '#6B7280',
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#0B3C5D' },
            }}
            bezier
            style={{ borderRadius: 8 }}
            withInnerLines={false}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/Admin/AdminriskScreen' as any)}
          >
            <Ionicons name="warning" size={18} color="#FFFFFF" />
            <Text style={styles.quickActionText}>View Risk List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: '#059669' }]}
            onPress={() => router.push('/Admin/AdminalertScreen' as any)}
          >
            <Ionicons name="folder-open-outline" size={18} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Open Cases</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.reportsBtn}
          onPress={() => router.push('/Admin/AdminReportScreen' as any)}
        >
          <Ionicons name="document-text-outline" size={18} color="#0B3C5D" />
          <Text style={styles.reportsBtnText}>Reports</Text>
          <Ionicons name="chevron-forward" size={16} color="#0B3C5D" />
        </TouchableOpacity>

        {/* High Risk Consumers */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>High Risk Consumers</Text>
          <TouchableOpacity onPress={() => router.push('/Admin/AdminriskScreen' as any)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {highRiskAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#059669" />
            <Text style={styles.emptyText}>No high risk consumers detected</Text>
          </View>
        ) : (
          highRiskAlerts.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.alertCard}
              onPress={() => router.push({
                pathname: '/Admin/AdminriskScreen' as any,
                params: { id: item.id },
              })}
            >
              <View style={styles.alertLeft}>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.riskLevel) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: getRiskColor(item.riskLevel) }]}>
                    {item.riskLevel}
                  </Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.alertName}>{item.consumerName}</Text>
                  <Text style={styles.alertId}>ID: {item.consumerId}</Text>
                  <Text style={styles.alertReason}>{item.reason}</Text>
                </View>
              </View>
              <View style={styles.alertRight}>
                <Text style={styles.alertUnits}>{item.units} kWh</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', marginTop: 12 },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#0B3C5D', paddingTop: 50, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  headerGreeting: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  headerRole: { fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: { padding: 6, position: 'relative' },
  badge: {
    position: 'absolute', top: 2, right: 2, backgroundColor: '#DC2626',
    borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFFFFF' },
  content: { padding: 16 },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#1F2933',
    marginBottom: 12, marginTop: 4,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  seeAllText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#0B3C5D' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    width: (screenWidth - 52) / 2 - 5,
    borderRadius: 12, padding: 14, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  kpiValue: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1F2933', marginTop: 6 },
  kpiLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', marginTop: 2 },
  kpiValueLight: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#FFFFFF', marginTop: 6 },
  kpiLabelLight: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 20, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1F2933' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickActionBtn: {
    flex: 1, backgroundColor: '#DC2626', borderRadius: 10,
    paddingVertical: 12, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  quickActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  reportsBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 20, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  reportsBtnText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#0B3C5D' },
  alertCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  riskBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  riskBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  alertName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1F2933' },
  alertId: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF' },
  alertReason: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', marginTop: 2 },
  alertRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertUnits: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#0B3C5D' },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
});