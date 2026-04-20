import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

/**
 * EMAIL OTP FLOW (Custom 6-digit code via email):
 * 1. On mount, generate a 6-digit OTP, store it in Firestore under otpCodes/{uid}
 * 2. Send it via a Cloud Function (or EmailJS) to user's email
 * 3. User enters OTP → verify against Firestore → mark emailVerified = true → navigate
 *
 * NOTE: Firebase does not natively send custom OTPs. 
 * This screen uses a Cloud Function endpoint `SEND_OTP_ENDPOINT` to send the email.
 * Replace SEND_OTP_ENDPOINT with your actual deployed Cloud Function URL.
 */

const SEND_OTP_ENDPOINT = 'https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/sendOtpEmail';

export default function LoginOTPScreen() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const role = params.role as string; // 'Admin' | 'Consumer'

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    sendOTP();
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendOTP = async () => {
    setSending(true);
    try {
      const generatedOtp = generateOTP();
      const user = auth.currentUser;
      if (!user) { Alert.alert('Error', 'Session expired. Please login again.'); router.back(); return; }

      // Store OTP in Firestore with expiry (10 minutes)
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const collectionName = role === 'Admin' ? 'admins' : 'consumers';
      const userQuery = query(collection(db, collectionName), where('uid', '==', user.uid));
      const snapshot = await getDocs(userQuery);

      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { otpCode: generatedOtp, otpExpiresAt: expiresAt });
      }

      // Send OTP via Cloud Function
      await fetch(SEND_OTP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: generatedOtp, role }),
      });

      setOtpSent(true);
      startCountdown();
      Alert.alert('OTP Sent', `A 6-digit verification code has been sent to ${email}`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { Alert.alert('Error', 'Session expired.'); router.back(); return; }

      const collectionName = role === 'Admin' ? 'admins' : 'consumers';
      const userQuery = query(collection(db, collectionName), where('uid', '==', user.uid));
      const snapshot = await getDocs(userQuery);

      if (snapshot.empty) { Alert.alert('Error', 'User record not found.'); setLoading(false); return; }

      const userData = snapshot.docs[0].data();
      const storedOtp = userData.otpCode;
      const otpExpiresAt = userData.otpExpiresAt;

      if (!storedOtp || Date.now() > otpExpiresAt) {
        Alert.alert('OTP Expired', 'Your OTP has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      if (otp !== storedOtp) {
        Alert.alert('Invalid OTP', 'The OTP you entered is incorrect.');
        setLoading(false);
        return;
      }

      // OTP verified — update Firestore
      await updateDoc(snapshot.docs[0].ref, {
        emailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        lastLoginAt: new Date().toISOString(),
      });

      // Navigate based on role
      if (role === 'Admin') {
        router.replace('/(Admin)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Something went wrong.');
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
        <Ionicons name="mail-outline" size={40} color="#0B3C5D" />
      </View>

      <Text style={styles.title}>
        {role === 'Admin' ? 'Admin Authentication' : 'Email Verification'}
      </Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit OTP sent to{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <TextInput
        style={styles.input}
        placeholder="• • • • • •"
        placeholderTextColor="#9CA3AF"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        maxLength={6}
      />

      <View style={styles.noticeBox}>
        <Ionicons
          name={role === 'Admin' ? 'shield-checkmark-outline' : 'mail-open-outline'}
          size={16}
          color="#0B3C5D"
        />
        <Text style={styles.noticeText}>
          {role === 'Admin'
            ? 'Admin accounts require email OTP for every login session.'
            : 'Check your email inbox (and spam) for the verification code.'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleVerifyOTP}
        disabled={loading || !otpSent}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.buttonText}>Verify & Login</Text>
        }
      </TouchableOpacity>

      {/* Resend OTP */}
      <TouchableOpacity
        style={[styles.resendBtn, (sending || countdown > 0) && styles.resendBtnDisabled]}
        onPress={sendOTP}
        disabled={sending || countdown > 0}
      >
        {sending
          ? <ActivityIndicator color="#0B3C5D" size="small" />
          : <Text style={styles.resendText}>
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28,
    paddingTop: 60, alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 20,
  },
  title: {
    fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933',
    marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  emailHighlight: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
  input: {
    width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular',
    fontSize: 24, color: '#1F2933', marginBottom: 14,
    textAlign: 'center', letterSpacing: 10,
  },
  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: 8, padding: 12, width: '100%', marginBottom: 24, gap: 8,
  },
  noticeText: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#0B3C5D', lineHeight: 18,
  },
  button: {
    width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8,
    paddingVertical: 15, alignItems: 'center', marginBottom: 14,
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  resendBtn: { paddingVertical: 10 },
  resendBtnDisabled: { opacity: 0.5 },
  resendText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0B3C5D' },
});