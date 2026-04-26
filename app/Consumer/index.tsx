import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

// ─── Types ───────────────────────────────────────────────────────
interface ConsumerData {
  consumerId: string;
  name: string;
  email: string;
  mobileNumber: string;
  address: string;
}

interface ConsumptionRecord {
  id: string;
  consumerId: string;
  dateRange: string;
  totalUnits: number;
  avgUnits: number;
  estimatedBill: number;
  riskScore: number;
  uploadedAt: Date;
}

interface CSVStats {
  totalUnits: number;
  avgUnits: number;
  estimatedBill: number;
}

// ─── CSV Parser ───────────────────────────────────────────────────
function parseCSV(content: string): CSVStats {
  const lines = content.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have header and data rows.');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const unitsIdx = headers.findIndex(h =>
    h.includes('unit') || h.includes('kwh') || h.includes('consumption')
  );
  if (unitsIdx === -1) throw new Error('CSV must have a units/kWh column.');

  let total = 0;
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const val = parseFloat(cols[unitsIdx]);
    if (!isNaN(val)) { total += val; count++; }
  }
  if (count === 0) throw new Error('No valid unit data found in CSV.');

  const avg = total / count;
  const bill = total * 20;
  return {
    totalUnits: Math.round(total),
    avgUnits: Math.round(avg * 10) / 10,
    estimatedBill: Math.round(bill),
  };
}

// ─── Date helpers ─────────────────────────────────────────────────
function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function getDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return `${formatDate(start)} – ${formatDate(now)}`;
}

// ─── Main Component ───────────────────────────────────────────────
export default function ConsumerDashboard() {
  const [consumer, setConsumer]         = useState<ConsumerData | null>(null);
  const [consumptions, setConsumptions] = useState<ConsumptionRecord[]>([]);
  const [csvFileName, setCsvFileName]   = useState<string | null>(null);
  const [csvStats, setCsvStats]         = useState<CSVStats | null>(null);
  const [csvContent, setCsvContent]     = useState<string>('');
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [today]                         = useState(new Date());

  // ── Fetch consumer by UID (primary) then fallback to email query ──
  const fetchConsumerData = async (uid: string, email: string | null) => {
    try {
      // 1️⃣ Try direct UID lookup in consumers collection
      const docSnap = await getDoc(doc(db, 'consumers', uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as ConsumerData;
        setConsumer(data);
        await fetchConsumptions(data.consumerId);
        return;
      }

      // 2️⃣ Fallback: query by email
      if (email) {
        const q = query(
          collection(db, 'consumers'),
          where('email', '==', email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as ConsumerData;
          setConsumer(data);
          await fetchConsumptions(data.consumerId);
          return;
        }
      }

      // 3️⃣ Try users collection by UID
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const data = userSnap.data() as ConsumerData;
        setConsumer(data);
        await fetchConsumptions(data.consumerId ?? uid);
        return;
      }

      console.warn('No consumer document found for uid:', uid);
    } catch (e) {
      console.error('Error fetching consumer:', e);
    }
  };

  // ── Auth listener ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/screens/LoginScreen');
        return;
      }
      setLoading(true);
      await fetchConsumerData(user.uid, user.email);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Fetch top 10 consumptions ──────────────────────────────────
  const fetchConsumptions = async (consumerId: string) => {
    try {
      const q = query(
        collection(db, 'consumptions'),
        where('consumerId', '==', consumerId),
        orderBy('uploadedAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const records: ConsumptionRecord[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<ConsumptionRecord, 'id'>),
        uploadedAt: d.data().uploadedAt?.toDate?.() ?? new Date(),
      }));
      setConsumptions(records);
    } catch (e) {
      console.error('Error fetching consumptions:', e);
    }
  };

  // ── Refresh ───────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (consumer) await fetchConsumptions(consumer.consumerId);
    setRefreshing(false);
  }, [consumer]);

  // ── Pick CSV ──────────────────────────────────────────────────
  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        Alert.alert('Invalid File', 'Please select a CSV file.');
        return;
      }
      const response = await fetch(file.uri);
      const text = await response.text();
      const stats = parseCSV(text);
      setCsvFileName(file.name);
      setCsvContent(text);
      setCsvStats(stats);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to read CSV file.');
    }
  };

  // ── Submit units ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!csvStats || !consumer) {
      Alert.alert('No File', 'Please select a CSV file first.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'consumptions'), {
        consumerId:    consumer.consumerId,
        consumerName:  consumer.name,
        email:         consumer.email,
        dateRange:     getDateRange(),
        totalUnits:    csvStats.totalUnits,
        avgUnits:      csvStats.avgUnits,
        estimatedBill: csvStats.estimatedBill,
        riskScore:     0,
        csvRaw:        csvContent,
        uploadedAt:    new Date(),
      });
      Alert.alert('Success ✅', 'Units submitted successfully!');
      setCsvFileName(null);
      setCsvStats(null);
      setCsvContent('');
      await fetchConsumptions(consumer.consumerId);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit units.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Risk helpers ──────────────────────────────────────────────
  const riskColor = (score: number) =>
    score <= 30 ? '#2EC4B6' : score <= 60 ? '#F59E0B' : '#EF4444';

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B3C5D" />
      </View>
    );
  }

  // ── Get first name only for greeting ─────────────────────────
  const firstName = consumer?.name?.split(' ')[0] ?? '—';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0B3C5D"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Card ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>Electra Guard</Text>
            </View>
          </View>
          <View style={styles.welcomeRow}>
            <View>
              {/* ✅ Real consumer name from Firebase */}
              <Text style={styles.welcomeText}>
                Welcome back, {firstName}
              </Text>
              <View style={styles.idRow}>
                <Text style={styles.idText}>
                  ID: {consumer?.consumerId ?? '—'}
                </Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                {today.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Date Range Pill ── */}
        <View style={styles.dateRangePill}>
          <Ionicons name="calendar-outline" size={14} color="#0B3C5D" />
          <Text style={styles.dateRangeText}>{getDateRange()}</Text>
        </View>

        {/* ── CSV Upload ── */}
        <Text style={styles.sectionTitle}>Enter CSV File</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={handlePickCSV}
          activeOpacity={0.8}
        >
          {csvFileName ? (
            <View style={styles.fileSelectedContainer}>
              <Ionicons name="document-text" size={32} color="#2EC4B6" />
              <Text style={styles.fileSelectedName} numberOfLines={1}>
                {csvFileName}
              </Text>
              <Text style={styles.fileSelectedSub}>Tap to change file</Text>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={36} color="#9CA3AF" />
              <Text style={styles.uploadTitle}>Upload CSV File</Text>
              <Text style={styles.uploadSub}>Supports up to 500MB files</Text>
              <View style={styles.selectBtn}>
                <Ionicons name="folder-outline" size={14} color="#FFFFFF" />
                <Text style={styles.selectBtnText}>Select File</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Units', value: csvStats?.totalUnits ?? 0, unit: 'kWh' },
            { label: 'Avg.',        value: csvStats?.avgUnits   ?? 0, unit: 'kWh' },
            { label: 'Est. Bill',   value: csvStats?.estimatedBill ?? 0, unit: 'PKR' },
          ].map(({ label, value, unit }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statUnit}>{unit}</Text>
            </View>
          ))}
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.submitBtnText}>Submit Units</Text>}
        </TouchableOpacity>

        {/* ── Recent Consumptions ── */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Consumptions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {consumptions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="analytics-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No consumption data yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recentScroll}
          >
            {consumptions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentCard}
                onPress={() =>
                  router.push({
                    pathname: '/Consumer/DetectionResultScreen' as any,
                    params: {
                      consumptionId: item.id,
                      totalUnits:    item.totalUnits,
                      avgUnits:      item.avgUnits,
                      estimatedBill: item.estimatedBill,
                      riskScore:     item.riskScore,
                      dateRange:     item.dateRange,
                    },
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.recentDateRange}>{item.dateRange}</Text>
                <Text style={styles.recentUnits}>
                  {item.totalUnits}{' '}
                  <Text style={styles.recentUnitLabel}>kWh</Text>
                </Text>
                <View
                  style={[
                    styles.riskBadge,
                    { backgroundColor: riskColor(item.riskScore) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.riskBadgeText,
                      { color: riskColor(item.riskScore) },
                    ]}
                  >
                    Risk {item.riskScore}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* ── Chatbot FAB and support screen ── */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => router.push('/Consumer/supportscreen' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="help-circle" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container:         { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 100 },

  headerCard:        { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  headerTop:         { marginBottom: 12 },
  logoRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImg:           { width: 36, height: 36 },
  logoText:          { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0B3C5D' },
  welcomeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeText:       { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1F2933', marginBottom: 4 },
  idRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  idText:            { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  activeBadge:       { backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  activeBadgeText:   { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#16A34A' },
  dateText:          { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },

  dateRangePill:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 20 },
  dateRangeText:     { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#0B3C5D' },

  sectionTitle:      { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#1F2933', marginBottom: 12 },

  uploadBox:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#2EC4B6', borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 16, minHeight: 140, justifyContent: 'center' },
  uploadPlaceholder: { alignItems: 'center', gap: 6 },
  uploadTitle:       { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#374151', marginTop: 4 },
  uploadSub:         { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },
  selectBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0B3C5D', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10 },
  selectBtnText:     { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  fileSelectedContainer: { alignItems: 'center', gap: 8 },
  fileSelectedName:  { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0B3C5D', maxWidth: 260, textAlign: 'center' },
  fileSelectedSub:   { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },

  statsRow:          { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:          { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  statValue:         { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#0B3C5D' },
  statLabel:         { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', textAlign: 'center' },
  statUnit:          { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#9CA3AF' },

  submitBtn:         { backgroundColor: '#0B3C5D', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 28 },
  submitBtnText:     { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },

  recentHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll:           { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#2EC4B6' },
  recentScroll:      { marginHorizontal: -20, paddingLeft: 20 },
  recentCard:        { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginRight: 12, width: 160, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  recentDateRange:   { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  recentUnits:       { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#0B3C5D' },
  recentUnitLabel:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  riskBadge:         { marginTop: 8, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  riskBadgeText:     { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  emptyBox:          { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  emptyText:         { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9CA3AF' },

  chatFab:           { position: 'absolute', bottom: 80, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#0B3C5D', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
});