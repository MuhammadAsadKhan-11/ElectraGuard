import React, { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { consumptionChartData, dashboardStats, mockCases } from '../../data/mockData';

const { width } = Dimensions.get('window');

interface Props {
  navigation: any;
}

const StatCard = ({ title, value, color, icon }: any) => (
  <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </View>
);

export default function ReportsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'Summary' | 'Cases' | 'Theft'>('Summary');

  const openCases = mockCases.filter(c => c.status === 'Open').length;
  const closedCases = mockCases.filter(c => c.status === 'Closed').length;
  const inProgressCases = mockCases.filter(c => c.status === 'In Progress').length;
  const rejectedCases = mockCases.filter(c => c.status === 'Rejected').length;

  const tabs = ['Summary', 'Cases', 'Theft'] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>System analytics & performance</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Summary' && (
          <View>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.statsGrid}>
              <StatCard title="Total Consumers" value={dashboardStats.totalConsumers.toLocaleString()} color={Colors.primary} icon="👥" />
              <StatCard title="Active Members" value={dashboardStats.activeMembers.toLocaleString()} color={Colors.success} icon="✅" />
              <StatCard title="High Risk" value={dashboardStats.highRiskConsumers} color={Colors.danger} icon="⚠️" />
              <StatCard title="Revenue Loss" value={dashboardStats.revenueLoss} color={Colors.warning} icon="💸" />
            </View>

            <Text style={styles.sectionTitle}>Case Distribution</Text>
            <View style={styles.card}>
              {[
                { label: 'Open', count: openCases, color: Colors.warning },
                { label: 'In Progress', count: inProgressCases, color: Colors.primary },
                { label: 'Closed', count: closedCases, color: Colors.success },
                { label: 'Rejected', count: rejectedCases, color: Colors.danger },
              ].map(item => (
                <View key={item.label} style={styles.distRow}>
                  <View style={[styles.distDot, { backgroundColor: item.color }]} />
                  <Text style={styles.distLabel}>{item.label}</Text>
                  <View style={styles.distBarWrap}>
                    <View style={[styles.distBar, {
                      width: `${(item.count / mockCases.length) * 100}%`,
                      backgroundColor: item.color
                    }]} />
                  </View>
                  <Text style={[styles.distCount, { color: item.color }]}>{item.count}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Monthly Performance</Text>
            <View style={styles.card}>
              <View style={styles.perfRow}>
                <Text style={styles.perfLabel}>Detection Rate</Text>
                <Text style={[styles.perfVal, { color: Colors.success }]}>94.2%</Text>
              </View>
              <View style={styles.perfRow}>
                <Text style={styles.perfLabel}>Resolution Time (avg)</Text>
                <Text style={[styles.perfVal, { color: Colors.primary }]}>3.4 days</Text>
              </View>
              <View style={styles.perfRow}>
                <Text style={styles.perfLabel}>Cases Resolved This Month</Text>
                <Text style={[styles.perfVal, { color: Colors.success }]}>{dashboardStats.casesResolved}</Text>
              </View>
              <View style={[styles.perfRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.perfLabel}>Estimated Revenue Saved</Text>
                <Text style={[styles.perfVal, { color: Colors.success }]}>PKR 0.8M</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Cases' && (
          <View>
            <Text style={styles.sectionTitle}>Recent Cases</Text>
            {mockCases.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.caseRow}
                onPress={() => navigation.navigate('CaseProfile', { caseItem: c })}
              >
                <View>
                  <Text style={styles.caseNumber}>{c.caseNumber}</Text>
                  <Text style={styles.caseName}>{c.consumerName}</Text>
                  <Text style={styles.caseDate}>{c.createdAt}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: c.status === 'Open' ? Colors.warning + '20' : c.status === 'Closed' ? Colors.success + '20' : Colors.primary + '20' }]}>
                  <Text style={[styles.statusText, { color: c.status === 'Open' ? Colors.warning : c.status === 'Closed' ? Colors.success : Colors.primary }]}>{c.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'Theft' && (
          <View>
            <Text style={styles.sectionTitle}>Theft Analytics</Text>
            <View style={styles.card}>
              <Text style={styles.cardSubTitle}>Consumption vs Theft — Last 7 Days</Text>
              {consumptionChartData.map((d, i) => (
                <View key={i} style={styles.theftRow}>
                  <Text style={styles.theftDate}>{d.date}</Text>
                  <View style={styles.theftBars}>
                    <View style={[styles.theftBar, { width: (d.normal / 500) * (width - 160), backgroundColor: Colors.primary }]} />
                    <View style={[styles.theftBar, { width: (d.theft / 500) * (width - 160), backgroundColor: Colors.danger }]} />
                  </View>
                  <Text style={styles.theftVal}>{d.theft}</Text>
                </View>
              ))}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.primary }]} /><Text style={styles.legendText}>Normal</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.danger }]} /><Text style={styles.legendText}>Theft</Text></View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardSubTitle}>Top Risk Areas</Text>
              {[
                { area: 'Blue Area', count: 12, pct: 28 },
                { area: 'DHA Phase 2', count: 9, pct: 21 },
                { area: 'G-15', count: 7, pct: 16 },
                { area: 'F-7', count: 5, pct: 12 },
              ].map((item, i) => (
                <View key={i} style={styles.areaRow}>
                  <Text style={styles.areaName}>{item.area}</Text>
                  <View style={styles.areaBarWrap}>
                    <View style={[styles.areaBar, { width: `${item.pct}%`, backgroundColor: Colors.danger }]} />
                  </View>
                  <Text style={styles.areaCount}>{item.count} cases</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    backgroundColor: Colors.white, padding: 20, margin: 16, borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginHorizontal: 16, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  statCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    width: (width - 40) / 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardSubTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLabel: { fontSize: 13, color: Colors.text, width: 80 },
  distBarWrap: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  distBar: { height: '100%', borderRadius: 4 },
  distCount: { fontSize: 14, fontWeight: '700', width: 24, textAlign: 'right' },
  perfRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  perfLabel: { fontSize: 13, color: Colors.textSecondary },
  perfVal: { fontSize: 15, fontWeight: '700' },
  caseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    marginHorizontal: 16, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  caseNumber: { fontSize: 14, fontWeight: '700', color: Colors.text },
  caseName: { fontSize: 12, color: Colors.textSecondary },
  caseDate: { fontSize: 11, color: Colors.textSecondary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '600' },
  theftRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  theftDate: { fontSize: 11, color: Colors.textSecondary, width: 48 },
  theftBars: { flex: 1, gap: 3 },
  theftBar: { height: 8, borderRadius: 4 },
  theftVal: { fontSize: 11, fontWeight: '600', color: Colors.danger, width: 32, textAlign: 'right' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
  areaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  areaName: { fontSize: 12, color: Colors.text, width: 80 },
  areaBarWrap: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  areaBar: { height: '100%', borderRadius: 4 },
  areaCount: { fontSize: 11, color: Colors.textSecondary, width: 60, textAlign: 'right' },
});
