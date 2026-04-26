import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

export default function ResetOTPVerifyScreen() {
  const { email, otp: storedOtp, expiresAt } = useLocalSearchParams<{
    email: string; otp: string; expiresAt: string;
  }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.'); return;
    }
    setLoading(true);
    try {
      // Expiry check
      if (Date.now() > Number(expiresAt)) {
        Alert.alert('Expired', 'OTP has expired. Please request a new one.');
        setLoading(false); return;
      }
      // Match check
      if (otp.trim() !== storedOtp?.trim()) {
        Alert.alert('Invalid Code', 'The code you entered is incorrect.');
        setLoading(false); return;
      }
      // Success → go to Reset Password screen
      router.replace({
        pathname: '/screens/ResetPasswordScreen',
        params: { email },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    router.back(); // Go back to ForgotPasswordScreen to resend
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#2EC4B6" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Verify Code</Text>

      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark-outline" size={32} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      {/* OTP Input */}
      <TextInput
        ref={inputRef}
        style={styles.otpInput}
        placeholder="● ● ● ● ● ●"
        placeholderTextColor="#B0BEC5"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        maxLength={6}
        textAlign="center"
        autoFocus
      />

      {/* Expiry notice */}
      <View style={styles.noticeBox}>
        <Ionicons name="time-outline" size={16} color="#2EC4B6" />
        <Text style={styles.noticeText}>Code expires in 10 minutes</Text>
      </View>

      {/* Verify Button */}
      <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.verifyButtonText}>Verify Code</Text>}
      </TouchableOpacity>

      {/* Resend */}
      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't receive the code? </Text>
        {canResend
          ? <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          : <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
        }
      </View>

      <TouchableOpacity onPress={() => router.push('/screens/LoginScreen')}>
        <Text style={styles.backToLogin}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1F2933', marginBottom: 32 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2EC4B6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emailHighlight: { fontFamily: 'Inter_600SemiBold', color: '#2EC4B6' },
  otpInput: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#2EC4B6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#1F2933',
    marginBottom: 16,
    letterSpacing: 12,
  },
  noticeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280' },
  verifyButton: { width: '100%', backgroundColor: '#2EC4B6', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  verifyButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  resendLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  resendLink: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#2EC4B6' },
  resendCountdown: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9CA3AF' },
  backToLogin: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#2EC4B6' },
});