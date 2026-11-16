import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from '../../../firebaseConfig';
import { useAppSettings } from '../../../hooks/AppSettingContext';

// Everything on this screen comes from the trained model's response
// (electra-api /predict), either passed straight from the upload or loaded
// from the saved consumption record.

type Level = 'low' | 'medium' | 'high';

interface Reading { label: string; value: number; flag: string | null }
interface Anomalies {
  days: number;
  total: number;
  mean: number;
  min: number;
  max: number;
  zeroDays: number;
  lowDays: number;
  spikeDays: number;
  notes: string[];
}
interface ResultExtras {
  anomalies: Anomalies | null;
  dailyReadings: Reading[];
  input?: { columnsFound: number; columnsUsed: number; usedLatestWindow: boolean } | null;
}

// Same bands as the model / admin side: >= 0.80 high, >= 0.50 medium.
function levelOf(riskLevel: string | undefined, riskScore: number): Level {
  const l = (riskLevel || '').toLowerCase();
  if (l === 'low' || l === 'medium' || l === 'high') return l;
  return riskScore >= 80 ? 'high' : riskScore >= 50 ? 'medium' : 'low';
}

function parseExtras(raw?: string): ResultExtras | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    return { anomalies: j.anomalies ?? null, dailyReadings: j.dailyReadings ?? [], input: j.input ?? null };
  } catch {
    return null;
  }
}

const FLAG_COLORS: Record<string, string> = { zero: '#FF3B30', low: '#FF9500', spike: '#AF52DE' };

export default function DetectionResultScreen() {
  const { colors } = useAppSettings();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    consumptionId: string;
    totalUnits:    string;
    avgUnits:      string;
    estimatedBill: string;
    riskScore:     string;
    riskLevel?:    string;
    probability?:  string;
    prediction?:   string;
    dateRange:     string;
    result?:       string;
  }>();
  const { consumptionId, totalUnits, avgUnits, estimatedBill, dateRange } = params;

  const fromParams = useMemo(() => parseExtras(params.result), [params.result]);
  const [extras, setExtras] = useState<ResultExtras | null>(fromParams);
  const [saved, setSaved] = useState<{ probability?: number; prediction?: string; riskLevel?: string } | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Opened from "Recent Consumptions": load the saved model output.
  useEffect(() => {
    setExtras(fromParams);
    setSaved(null);
    if (fromParams || !consumptionId) return;
    let active = true;
    setLoadingExtras(true);
    getDoc(doc(db, 'consumptions', consumptionId))
      .then((snap) => {
        if (!active || !snap.exists()) return;
        const d = snap.data() as any;
        setExtras({ anomalies: d.anomalies ?? null, dailyReadings: d.dailyReadings ?? [], input: d.modelInput ?? null });
        setSaved({ probability: d.probability, prediction: d.prediction, riskLevel: d.riskLevel });
      })
      .catch(() => {})
      .finally(() => active && setLoadingExtras(false));
    return () => {
      active = false;
    };
  }, [consumptionId, fromParams]);

  const riskScore   = Number(params.riskScore ?? 0) || 0;
  const probability = params.probability ? Number(params.probability) : saved?.probability;
  const prediction  = params.prediction || saved?.prediction || '';
  const level       = levelOf(params.riskLevel || saved?.riskLevel, riskScore);

  const isTheft     = level === 'high';
  const isMedium    = level === 'medium';
  const riskColor   = isTheft ? '#FF3B30' : isMedium ? '#FF9500' : '#34C759';
  const riskLabel   = isTheft ? 'High Risk' : isMedium ? 'Medium Risk' : 'Low Risk';
  const riskBgColor = isTheft ? '#FEF2F2' : isMedium ? '#FFFBEB' : '#F0FDF4';
  const readings    = extras?.dailyReadings ?? [];
  const maxReading  = Math.max(1, ...readings.map((r) => r.value));
  const anomalies   = extras?.anomalies;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/src/Consumer' as any)}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Detection Result</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Result Icon ── */}
        <View style={[styles.resultIconCircle, { backgroundColor: riskBgColor }]}>
          <Ionicons
            name={isTheft ? 'warning' : isMedium ? 'alert-circle' : 'checkmark-circle'}
            size={52}
            color={riskColor}
          />
        </View>

        {/* ── Result Title ── */}
        <Text style={[styles.resultTitle, { color: isTheft ? '#FF3B30' : colors.text }]}>
          {isTheft ? 'Theft Detected!' : isMedium ? 'Suspicious Activity' : 'No Theft Detected'}
        </Text>
        <Text style={styles.resultSub}>
          {isTheft
            ? 'Unusual consumption pattern detected. Please contact support.'
            : isMedium
            ? 'Some anomalies found. Monitor your usage carefully.'
            : 'Your consumption pattern is normal'}
        </Text>

        {/* ── Risk Score Card ── */}
        <View style={styles.riskCard}>
          <View style={styles.riskCardHeader}>
            <Text style={styles.riskCardTitle}>Risk Score</Text>
            <View style={[styles.riskLabelBadge, { backgroundColor: riskColor + '20' }]}>
              <Text style={[styles.riskLabelText, { color: riskColor }]}>{riskLabel}</Text>
            </View>
          </View>
          <Text style={styles.riskScoreValue}>
            {riskScore}<Text style={styles.riskScoreMax}>/100</Text>
          </Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, riskScore))}%`, backgroundColor: riskColor }]} />
          </View>
          <View style={styles.modelRow}>
            <View style={styles.modelCell}>
              <Text style={styles.modelLabel}>Theft probability</Text>
              <Text style={styles.modelValue}>
                {probability != null && isFinite(probability) ? `${(probability * 100).toFixed(1)}%` : '—'}
              </Text>
            </View>
            <View style={styles.modelCell}>
              <Text style={styles.modelLabel}>Model verdict</Text>
              <Text style={[styles.modelValue, { color: prediction === 'Theft Detected' ? '#FF3B30' : '#111111' }]}>
                {prediction || '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats Cards ── */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Units',   value: totalUnits,    unit: 'kWh' },
            { label: 'Avg. Daily',    value: avgUnits,      unit: 'kWh' },
            { label: 'Est. Bill',     value: estimatedBill, unit: 'PKR' },
          ].map(({ label, value, unit }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value || '—'}</Text>
              <Text style={styles.statUnit}>{unit}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Daily Breakdown (readings the model analysed) ── */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Daily Breakdown</Text>
          {loadingExtras ? (
            <ActivityIndicator color="#0B3C5D" />
          ) : readings.length === 0 ? (
            <Text style={styles.mutedText}>Daily readings are not available for this record.</Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.barsRow}>
                  {readings.map((r, i) => (
                    <View key={`${r.label}-${i}`} style={styles.barItem}>
                      <Text style={styles.barValue}>{r.value}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${Math.max(4, (r.value / maxReading) * 100)}%`,
                              backgroundColor: r.flag ? FLAG_COLORS[r.flag] ?? '#FF9500' : '#34C759',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.dayLabel} numberOfLines={1}>
                        {r.label.length > 5 ? r.label.slice(0, 5) : r.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.legendRow}>
                {[
                  ['#34C759', 'Normal'],
                  [FLAG_COLORS.zero, 'Zero'],
                  [FLAG_COLORS.low, 'Very low'],
                  [FLAG_COLORS.spike, 'Spike'],
                ].map(([c, l]) => (
                  <View key={l} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: c }]} />
                    <Text style={styles.legendText}>{l}</Text>
                  </View>
                ))}
              </View>
              {extras?.input?.usedLatestWindow && (
                <Text style={styles.mutedText}>
                  Your file had {extras.input.columnsFound} days; the model analysed the latest {extras.input.columnsUsed}.
                </Text>
              )}
            </>
          )}
        </View>

        {/* ── Anomalies ── */}
        {anomalies && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Anomaly Analysis</Text>
            {[
              ['Days analysed', String(anomalies.days)],
              ['Average / day', `${anomalies.mean} kWh`],
              ['Lowest / highest', `${anomalies.min} / ${anomalies.max} kWh`],
              ['Zero-consumption days', String(anomalies.zeroDays)],
              ['Very low days', String(anomalies.lowDays)],
              ['Unusual spikes', String(anomalies.spikeDays)],
            ].map(([k, v]) => (
              <View key={k} style={styles.anomalyRow}>
                <Text style={styles.anomalyKey}>{k}</Text>
                <Text style={styles.anomalyValue}>{v}</Text>
              </View>
            ))}
            {anomalies.notes.length === 0 ? (
              <Text style={styles.mutedText}>No unusual days were found in these readings.</Text>
            ) : (
              anomalies.notes.map((n) => (
                <View key={n} style={styles.noteRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#FF9500" />
                  <Text style={styles.noteText}>{n}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Date Range ── */}
        {dateRange ? (
          <View style={styles.dateRangeRow}>
            <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
            <Text style={styles.dateRangeText}>{dateRange}</Text>
          </View>
        ) : null}

        {/* ── Alert Banner (theft only) ── */}
        {isTheft && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={18} color="#FF3B30" />
            <Text style={styles.alertText}>
              Immediate action required! Your account has been flagged for investigation.
            </Text>
          </View>
        )}

        {/* ── Info Banner ── */}
        <View style={[styles.infoBanner, { backgroundColor: riskBgColor, borderColor: riskColor + '40' }]}>
          <Ionicons name="information-circle-outline" size={14} color={riskColor} />
          <Text style={[styles.infoText, { color: riskColor }]}>
            {isTheft
              ? 'Please contact ElectraGuard support through the Help section.'
              : isMedium
              ? 'Keep an eye on your usage. Open the assistant if you have questions.'
              : 'Continue saving energy! Your consumption is within normal limits.'}
          </Text>
        </View>

        {/* ── Go to Dashboard ── */}
        <TouchableOpacity
          style={[styles.dashboardBtn, { backgroundColor: isTheft ? '#FF3B30' : '#007AFF' }]}
          onPress={() => router.navigate('/src/Consumer' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: '#F2F2F7' },

  // Top bar
  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#0B3C5D', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn:            { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  topTitle:           { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#FFFFFF' },

  container:          { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center', paddingTop: 16 },

  // Result icon
  resultIconCircle:   { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  resultTitle:        { fontFamily: 'Poppins_700Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 },
  resultSub:          { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 },

  // Risk card
  riskCard:           { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  riskCardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskCardTitle:      { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#111111' },
  riskLabelBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  riskLabelText:      { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  riskScoreValue:     { fontFamily: 'Poppins_700Bold', fontSize: 36, color: '#111111', marginBottom: 10 },
  riskScoreMax:       { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#8E8E93' },
  progressBg:         { width: '100%', height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill:       { height: 8, borderRadius: 4 },
  modelRow:           { flexDirection: 'row', marginTop: 16, gap: 12 },
  modelCell:          { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 },
  modelLabel:         { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#8E8E93' },
  modelValue:         { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#111111', marginTop: 2 },

  // Stats
  statsGrid:          { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 16 },
  statCard:           { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  statValue:          { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#111111' },
  statUnit:           { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#8E8E93' },
  statLabel:          { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#8E8E93', textAlign: 'center', marginTop: 2 },

  // Daily breakdown
  breakdownCard:      { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  breakdownTitle:     { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#111111', marginBottom: 14 },
  barsRow:            { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: 4 },
  barItem:            { alignItems: 'center', width: 30 },
  barValue:           { fontFamily: 'Inter_400Regular', fontSize: 8, color: '#8E8E93', marginBottom: 2 },
  barTrack:           { width: 14, height: 90, backgroundColor: '#F3F4F6', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:            { width: '100%', borderRadius: 7 },
  dayLabel:           { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#8E8E93', marginTop: 4 },
  legendRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:         { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280' },
  mutedText:          { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8E8E93', marginTop: 8 },

  // Anomalies
  anomalyRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  anomalyKey:         { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  anomalyValue:       { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#111111' },
  noteRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  noteText:           { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#92400E', flex: 1 },

  // Date range
  dateRangeRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  dateRangeText:      { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8E8E93' },

  // Alert banner
  alertBanner:        { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  alertText:          { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: '#FF3B30', lineHeight: 18 },

  // Info banner
  infoBanner:         { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1 },
  infoText:           { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },

  // Dashboard button
  dashboardBtn:       { width: '100%', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  dashboardBtnText:   { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
});
