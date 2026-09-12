import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppSettings } from '../../../hooks/AppSettingContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DetectionResultScreen() {
  const { colors } = useAppSettings();
  const {
    consumptionId,
    totalUnits,
    avgUnits,
    estimatedBill,
    riskScore: riskScoreStr,
    dateRange,
  } = useLocalSearchParams<{
    consumptionId: string;
    totalUnits:    string;
    avgUnits:      string;
    estimatedBill: string;
    riskScore:     string;
    dateRange:     string;
  }>();

  const riskScore    = Number(riskScoreStr ?? 0);
  const isTheft      = riskScore > 60;
  const isMedium     = riskScore > 30 && riskScore <= 60;

  const riskColor    = isTheft ? '#EF4444' : isMedium ? '#F59E0B' : '#2EC4B6';
  const riskLabel    = isTheft ? 'High Risk' : isMedium ? 'Medium Risk' : 'Low Risk';
  const riskBgColor  = isTheft ? '#FEF2F2' : isMedium ? '#FFFBEB' : '#F0FFFE';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0B3C5D" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Detection Result</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Result Icon ── */}
        <View style={[styles.resultIconCircle, { backgroundColor: riskBgColor }]}>
          <Ionicons
            name={isTheft ? 'warning' : 'checkmark-circle'}
            size={52}
            color={riskColor}
          />
        </View>

        {/* ── Result Title ── */}
        <Text style={[styles.resultTitle, { color: isTheft ? '#EF4444' : '#1F2933' }]}>
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
          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${riskScore}%`, backgroundColor: riskColor }]} />
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
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statUnit}>{unit}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Daily Breakdown ── */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Daily Breakdown</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <View key={day} style={styles.dayItem}>
                <View style={[styles.dayDot, { backgroundColor: isTheft ? '#EF4444' : '#2EC4B6' }]}>
                  <Ionicons
                    name={isTheft ? 'close' : 'checkmark'}
                    size={10}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Date Range ── */}
        {dateRange ? (
          <View style={styles.dateRangeRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.dateRangeText}>{dateRange}</Text>
          </View>
        ) : null}

        {/* ── Alert Banner (theft only) ── */}
        {isTheft && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.alertText}>
              Immediate action required! Your account has been flagged for investigation.
            </Text>
          </View>
        )}

        {/* ── Info Banner ── */}
        <View style={[styles.infoBanner, { backgroundColor: riskBgColor, borderColor: riskColor + '40' }]}>
          <Ionicons name="location-outline" size={14} color={riskColor} />
          <Text style={[styles.infoText, { color: riskColor }]}>
            {isTheft
              ? 'Contact ElectraGuard support immediately at 1800-xxx-xxxx'
              : 'Continue saving energy! Your consumption is within normal limits.'}
          </Text>
        </View>

        {/* ── Go to Dashboard ── */}
        <TouchableOpacity
          style={[styles.dashboardBtn, { backgroundColor: isTheft ? '#EF4444' : '#2EC4B6' }]}
          onPress={() => router.replace('/src/Consumer' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: '#F8FAFC' },

  // Top bar
  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#F8FAFC' },
  backBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  topTitle:           { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#1F2933' },

  container:          { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },

  // Result icon
  resultIconCircle:   { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  resultTitle:        { fontFamily: 'Poppins_700Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 },
  resultSub:          { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 },

  // Risk card
  riskCard:           { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  riskCardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskCardTitle:      { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#1F2933' },
  riskLabelBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  riskLabelText:      { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  riskScoreValue:     { fontFamily: 'Poppins_700Bold', fontSize: 36, color: '#1F2933', marginBottom: 10 },
  riskScoreMax:       { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#9CA3AF' },
  progressBg:         { width: '100%', height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill:       { height: 8, borderRadius: 4 },

  // Stats
  statsGrid:          { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 16 },
  statCard:           { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  statValue:          { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0B3C5D' },
  statUnit:           { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#9CA3AF' },
  statLabel:          { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 2 },

  // Daily breakdown
  breakdownCard:      { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  breakdownTitle:     { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#1F2933', marginBottom: 14 },
  daysRow:            { flexDirection: 'row', justifyContent: 'space-between' },
  dayItem:            { alignItems: 'center', gap: 6 },
  dayDot:             { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dayLabel:           { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280' },

  // Date range
  dateRangeRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  dateRangeText:      { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },

  // Alert banner
  alertBanner:        { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  alertText:          { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: '#DC2626', lineHeight: 18 },

  // Info banner
  infoBanner:         { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1 },
  infoText:           { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },

  // Dashboard button
  dashboardBtn:       { width: '100%', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  dashboardBtnText:   { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
});