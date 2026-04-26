import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { db } from '../../firebaseConfig';

// ─── EmailJS config ─────────────────────────────────────────────
const EMAILJS_SERVICE_ID = 'service_ppos2gl';
const EMAILJS_TEMPLATE_ID = 'template_wnuezjd';
const EMAILJS_PUBLIC_KEY = '83JP4TIBzm32sCEDB';
// ────────────────────────────────────────────────────────────────

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPviaEmailJS(toEmail: string, otp: string): Promise<void> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        otp_code: otp,
      },
    }),
  });
  if (!res.ok) throw new Error('Failed to send OTP email.');
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) { Alert.alert('Error', 'Please enter your email.'); return; }
    setLoading(true);
    try {
      let foundEmail = '';

      if (email.includes('@')) {
        foundEmail = email;
      } else {
        // Consumer ID se email dhundo
        const q = query(collection(db, 'consumers'), where('consumerId', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          foundEmail = snapshot.docs[0].data().email;
        } else {
          Alert.alert('Error', 'No account found.'); setLoading(false); return;
        }
      }

      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      await sendOTPviaEmailJS(foundEmail, otp);

      Alert.alert('Code Sent', 'A 6-digit code has been sent to your email.', [
        {
          text: 'OK',
          onPress: () => router.push({
            pathname: '/screens/ResetOTPVerifyScreen',
            params: { email: foundEmail, otp, expiresAt: expiresAt.toString() },
          }),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Text style={styles.headerTitle}>Password Reset</Text>

      <View style={styles.iconContainer}>
        <Ionicons name="mail-outline" size={32} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        {"Enter your registered email or Consumer ID. We'll send you an OTP to verify your identity."}
      </Text>

      <Text style={styles.label}>Enter your Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Email or Consumer ID"
        placeholderTextColor="#B0BEC5"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.noticeBox}>
        <Ionicons name="checkmark-circle" size={18} color="#2EC4B6" />
        <View style={styles.noticeTextContainer}>
          <Text style={styles.noticeTitle}>Secure Verification</Text>
          <Text style={styles.noticeText}>
            A 6-digit code will be sent to your registered email for verification.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.sendButton} onPress={handleSendCode} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.sendButtonText}>Send Code</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/screens/LoginScreen')}>
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.supportText}>
        Need help? Contact support at{' '}
        <Text style={styles.supportLink}>1800-xxx-xxxx</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1F2933', marginBottom: 32 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2EC4B6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 8 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#374151', alignSelf: 'flex-start', marginBottom: 6 },
  input: { width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933', marginBottom: 16 },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FFFE', borderRadius: 8, borderWidth: 1, borderColor: '#CCF5F2', padding: 12, width: '100%', marginBottom: 28, gap: 10 },
  noticeTextContainer: { flex: 1 },
  noticeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1F2933', marginBottom: 2 },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', lineHeight: 18 },
  sendButton: { width: '100%', backgroundColor: '#2EC4B6', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  sendButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  backButton: { width: '100%', borderRadius: 8, borderWidth: 1.5, borderColor: '#D1D5DB', paddingVertical: 14, alignItems: 'center', marginBottom: 24, backgroundColor: '#FFFFFF' },
  backButtonText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#374151' },
  supportText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  supportLink: { color: '#2EC4B6', fontFamily: 'Inter_500Medium' },
});