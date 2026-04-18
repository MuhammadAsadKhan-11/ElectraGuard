import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth } from '../../firebaseConfig';

export default function LoginOTPScreen() {
  const params = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    Alert.alert('OTP Sent', 'OTP aapke registered mobile number par bhej diya gaya hai.');
    setOtpSent(true);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) { Alert.alert('Error', 'Please enter the OTP.'); return; }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#0B3C5D" />
      </TouchableOpacity>
      <View style={styles.iconContainer}>
        <Ionicons name="phone-portrait-outline" size={40} color="#0B3C5D" />
      </View>
      <Text style={styles.title}>Login Authentication</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to your registered mobile number.</Text>

      <TextInput style={styles.input} placeholder="Enter OTP" placeholderTextColor="#9CA3AF" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />

      <View style={styles.noticeBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#0B3C5D" />
        <Text style={styles.noticeText}>OTP has been sent to your registered mobile number.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={otpSent ? handleVerifyOTP : handleSendOTP} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{otpSent ? 'Verify & Login' : 'Send OTP'}</Text>}
      </TouchableOpacity>

      <Text style={styles.registerText}>
        Don't have an account?{' '}
        <Text style={styles.registerLink} onPress={() => router.push('/screens/LoginScreen')}>Register Now</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 60, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1F2933', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  input: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 18, color: '#1F2933', marginBottom: 14, textAlign: 'center', letterSpacing: 4 },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, width: '100%', marginBottom: 24, gap: 8 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#0B3C5D', lineHeight: 18 },
  button: { width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  registerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 8 },
  registerLink: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
});