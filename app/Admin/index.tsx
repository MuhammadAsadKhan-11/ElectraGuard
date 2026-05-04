import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, getDocs, query, where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { consumptionChartData, dashboardStats } from '../../data/mockData';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;

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

const KPI_IMAGES = [
  require('../../assets/Users.png'),
  require('../../assets/ChartLine.png'),
  require('../../assets/ShieldWarning.png'),
  require('../../assets/Suitcase.png'),
  require('../../assets/CurrencyDollar.png'),
  require('../../assets/CheckCircle.png'),
];

const KPICard = ({
  title, value, subtitle, color, badge, imageIndex,
}: {
  title: string; value: string; subtitle: string;
  color: string; badge?: { label: string; color: string }; imageIndex: number;
}) => (
  <View style={styles.kpiCard}>
    <View style={styles.kpiHeader}>
      <Image
        source={KPI_IMAGES[imageIndex]}
        style={styles.kpiIcon}
        resizeMode="contain"
      />
      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.kpiValue, { color }]} numberOfLines={1}>{value}</Text>
    <Text style={styles.kpiTitle} numberOfLines={2}>{title}</Text>
    <Text style={styles.kpiSubtitle}>{subtitle}</Text>
  </View>
);

// ─── Mini Chart ──────────────────────────────────────────────────────────────
const MiniChart = () => {
  const maxVal = 500;
  const minVal = 140;
  const range = maxVal - minVal;

  const getY = (val: number) =>
    CHART_HEIGHT - ((val - minVal) / range) * (CHART_HEIGHT * 0.85) - 10;
  const getX = (i: number) =>
    (i / (consumptionChartData.length - 1)) * (CHART_WIDTH - 20) + 10;

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.chartHeaderRow}>
        <View>
          <Text style={styles.chartTitle}>Total Consumption</Text>
          <Text style={styles.chartSub}>Last 7 days</Text>
        </View>
        <View style={styles.spikeTag}>
          <Text style={styles.spikeTagText}>▲ 2.5x spike</Text>
        </View>
      </View>

      <View style={{ height: CHART_HEIGHT, marginTop: 8 }}>
        {[200, 300, 400, 500].map((v) => (
          <View
            key={v}
            style={[styles.gridLineRow, { bottom: ((v - minVal) / range) * CHART_HEIGHT * 0.85 + 5 }]}
          >
            <Text style={styles.gridLabel}>{v}</Text>
            <View style={styles.gridLineSep} />
          </View>
        ))}

        <View style={StyleSheet.absoluteFill}>
          {consumptionChartData.map((d, i) => {
            if (i === 0) return null;
            const prev = consumptionChartData[i - 1];
            const nx1 = getX(i - 1), ny1 = getY(prev.normal);
            const nx2 = getX(i), ny2 = getY(d.normal);
            const nLen = Math.sqrt((nx2 - nx1) ** 2 + (ny2 - ny1) ** 2);
            const nAngle = Math.atan2(ny2 - ny1, nx2 - nx1) * (180 / Math.PI);
            const tx1 = getX(i - 1), ty1 = getY(prev.theft);
            const tx2 = getX(i), ty2 = getY(d.theft);
            const tLen = Math.sqrt((tx2 - tx1) ** 2 + (ty2 - ty1) ** 2);
            const tAngle = Math.atan2(ty2 - ty1, tx2 - tx1) * (180 / Math.PI);
            return (
              <View key={i}>
                <View style={[styles.chartLine, {
                  left: nx1, top: ny1, width: nLen,
                  backgroundColor: Colors.accent,
                  transform: [{ rotate: `${nAngle}deg` }],
                }]} />
                <View style={[styles.chartLine, {
                  left: tx1, top: ty1, width: tLen,
                  backgroundColor: Colors.danger,
                  transform: [{ rotate: `${tAngle}deg` }],
                }]} />
              </View>
            );
          })}
          {consumptionChartData.map((d, i) => (
            <View key={`dots-${i}`}>
              <View style={[styles.chartDot, {
                left: getX(i) - 4, top: getY(d.normal) - 4,
                backgroundColor: Colors.accent,
              }]} />
              <View style={[styles.chartDot, {
                left: getX(i) - 4, top: getY(d.theft) - 4,
                backgroundColor: Colors.danger,
              }]} />
            </View>
          ))}
        </View>

        <View style={[styles.xLabels, { top: CHART_HEIGHT - 2 }]}>
          {consumptionChartData.map((d, i) => (
            <Text key={i} style={styles.xLabel}>{d.date.replace('Feb ', '')}</Text>
          ))}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
          <Text style={styles.legendText}>Theft</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
          <Text style={styles.legendText}>Normal Consumption</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();

  // ✅ Admin name state
  const [adminName, setAdminName] = useState('Admin');

  // ✅ Firebase se admin name fetch karo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Admins collection mein uid se dhundo
          const adminSnap = await getDocs(
            query(collection(db, 'admins'), where('uid', '==', user.uid))
          );

          if (!adminSnap.empty) {
            const adminData = adminSnap.docs[0].data();
            // ✅ 'name' field Firebase se fetch karo
            // Agar tumhara field alag hai (jaise 'fullName', 'adminName') toh woh likho
            const fetchedName = adminData.name || adminData.fullName || adminData.email || 'Admin';
            setAdminName(fetchedName);
          }
        } catch (error) {
          console.log('Error fetching admin name:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            {/* ✅ Firebase se fetch kiya gaya name */}
            <Text style={styles.adminName}>{adminName}</Text>
            <Text style={styles.adminRole}>System Administrator</Text>
          </View>

          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/Admin/notifications')}
          >
            <Image
              source={require('../../assets/Bell.png')}
              style={styles.bellImage}
              resizeMode="contain"
            />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── KPIs ── */}
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          <KPICard
            imageIndex={0}
            title="Total Consumers"
            value={dashboardStats.totalConsumers.toLocaleString()}
            subtitle="kWh this month"
            color={Colors.text}
            badge={{ label: '▲ 5.2%', color: Colors.success }}
          />
          <KPICard
            imageIndex={1}
            title="Active Members"
            value={dashboardStats.activeMembers.toLocaleString()}
            subtitle="98.5% active"
            color={Colors.text}
          />
          <KPICard
            imageIndex={2}
            title="High-Risk Consumers"
            value={dashboardStats.highRiskConsumers.toString()}
            subtitle="1.3% of total"
            color={Colors.danger}
            badge={{ label: '▲ 12%', color: Colors.danger }}
          />
          <KPICard
            imageIndex={3}
            title="Theft Cases"
            value={dashboardStats.theftCases.toString()}
            subtitle="Active cases"
            color={Colors.danger}
          />
          <KPICard
            imageIndex={4}
            title="Revenue Loss"
            value={dashboardStats.revenueLoss}
            subtitle="Estimated monthly"
            color={Colors.text}
          />
          <KPICard
            imageIndex={5}
            title="Cases Resolved"
            value={dashboardStats.casesResolved.toString()}
            subtitle="This month"
            color={Colors.success}
            badge={{ label: '▲ 8%', color: Colors.success }}
          />
        </View>

        {/* ── Chart ── */}
        <Text style={styles.sectionTitle}>Consumption & Theft Analytics</Text>
        <View style={styles.card}>
          <MiniChart />
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/Admin/RisksScreen')}
          >
            <Text style={styles.quickBtnText}>View Risk List</Text>
            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/Admin/CasesScreen')}
          >
            <Text style={styles.quickBtnText}>Open Cases</Text>
            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtnFull}
            onPress={() => router.push('/Admin/ReportsScreen')}
          >
            <Text style={styles.quickBtnText}>Reports</Text>
            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.white, padding: 20, margin: 16, borderRadius: 16, marginTop: 40,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  adminName: { fontSize: 15, fontWeight: '600', color: Colors.primary, marginTop: 4 },
  adminRole: { fontSize: 12, color: Colors.textSecondary },
  bellBtn: { position: 'relative', padding: 4 },
  bellImage: { width: 28, height: 28 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.danger, borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text,
    marginHorizontal: 16, marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8, marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    width: (width - 40) / 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  kpiIcon: { width: 32, height: 32 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  kpiValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  kpiTitle: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  kpiSubtitle: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  chartWrapper: {},
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  chartSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  spikeTag: { backgroundColor: '#FF3B3020', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  spikeTagText: { color: Colors.danger, fontSize: 11, fontWeight: '600' },
  gridLineRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  gridLabel: { fontSize: 9, color: Colors.textSecondary, width: 28 },
  gridLineSep: { flex: 1, height: 1, backgroundColor: Colors.border, opacity: 0.5 },
  chartLine: { position: 'absolute', height: 2, transformOrigin: '0 0', borderRadius: 1 },
  chartDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
  xLabels: { position: 'absolute', left: 28, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  xLabel: { fontSize: 9, color: Colors.textSecondary },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
  quickGrid: { paddingHorizontal: 16, gap: 10 },
  quickBtn: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  quickBtnFull: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  quickBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  quickArrow: { fontSize: 20, color: Colors.primary },
});