import { Ionicons } from '@expo/vector-icons';
import {
  collection, getDocs, limit, orderBy, query, where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { db } from '../../firebaseConfig';

const screenWidth = Dimensions.get('window').width;

interface MonthlyReport {
  month: string;
  totalConsumption: number;
  theftCases: number;
  recoveredAmount: number;
  newConsumers: number;
}

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalTheftCases: 0,
    totalResolved: 0,
    totalPending: 0,
    detectionRate: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const reportsSnap = await getDocs(
        query(collection(db, 'monthlyReports'), orderBy('month', 'desc'), limit(6))
      );
      const data: MonthlyReport[] = reportsSnap.docs.map((d) => d.data() as MonthlyReport);
      setReports(data.reverse());

      const [theftSnap, resolvedSnap, pendingSnap] = await Promise.all([
        getDocs(query(collection(db, 'alerts'), where('riskLevel', '==', 'High'))),
        getDocs(query(collection(db, 'alerts'), where('status', '==', 'resolved'))),
        getDocs(query(collection(db, 'alerts'), where('status', '==', 'active'))),
      ]);

      const total = theftSnap.size;
      const resolved = resolvedSnap.size;
      setSummary({
        totalTheftCases: total,
        totalResolved: resolved,
        totalPending: pendingSnap.size,
        detectionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const barLabels = reports.map((r) => r.month?.substring(0, 3) || '');
  const barValues = reports.map((r) => r.totalConsumption || 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B3C5D" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        {/* Export button — no separate screen needed, just show alert */}
        <TouchableOpacity onPress={() => alert('Export feature coming soon!')}>
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        <Text style={styles.sectionTitle}>Theft Detection Summary</Text>
        <View style={styles.summaryGrid}>
          {[
            { label: 'Total Cases', value: summary.totalTheftCases, icon: 'warning-outline', color: '#DC2626' },
            { label: 'Resolved', value: summary.totalResolved, icon: 'checkmark-circle-outline', color: '#059669' },
            { label: 'Pending', value: summary.totalPending, icon: 'time-outline', color: '#D97706' },
            { label: 'Detection Rate', value: `${summary.detectionRate}%`, icon: 'analytics-outline', color: '#0B3C5D' },
          ].map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
              <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {reports.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Monthly Consumption (kWh)</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={{
                  labels: barLabels.length > 0 ? barLabels : ['No Data'],
                  datasets: [{ data: barValues.length > 0 ? barValues : [0] }],
                }}
                width={screenWidth - 64}
                height={200}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(11, 60, 93, ${opacity})`,
                  labelColor: () => '#6B7280',
                }}
                style={{ borderRadius: 8 }}
                showValuesOnTopOfBars
                yAxisSuffix=""
                yAxisLabel=""
              />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
        {reports.map((report, index) => (
          <View key={index} style={styles.reportRow}>
            <View style={styles.reportMonth}>
              <Text style={styles.reportMonthText}>{report.month}</Text>
            </View>
            <View style={styles.reportStats}>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>Consumption</Text>
                <Text style={styles.reportStatValue}>
                  {report.totalConsumption?.toLocaleString() || 0} kWh
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>Theft Cases</Text>
                <Text style={[styles.reportStatValue, { color: '#DC2626' }]}>
                  {report.theftCases || 0}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatLabel}>New Users</Text>
                <Text style={[styles.reportStatValue, { color: '#059669' }]}>
                  +{report.newConsumers || 0}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {reports.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>No report data available yet</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => alert('Export feature coming soon!')}
        >
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>Export Full Report (PDF)</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#0B3C5D', paddingTop: 50, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#FFFFFF' },
  content: { padding: 16 },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#1F2933',
    marginBottom: 12, marginTop: 8,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: {
    width: (screenWidth - 52) / 2 - 5,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, alignItems: 'center', gap: 6,
  },
  summaryValue: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933' },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', textAlign: 'center' },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 20, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  reportRow: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  reportMonth: { marginBottom: 10 },
  reportMonthText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#0B3C5D' },
  reportStats: { flexDirection: 'row', justifyContent: 'space-between' },
  reportStat: { alignItems: 'center' },
  reportStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF' },
  reportStatValue: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#1F2933', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
  exportBtn: {
    backgroundColor: '#0B3C5D', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 10, marginBottom: 30,
  },
  exportBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' },
});