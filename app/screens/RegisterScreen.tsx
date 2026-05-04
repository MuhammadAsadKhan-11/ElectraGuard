import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

// ── EmailJS Config ─────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID           = 'service_wynnt38';
const EMAILJS_PUBLIC_KEY           = 'hMZkNajE1DpuQeOMQ';
const EMAILJS_PRIVATE_KEY          = 'n5Zknt7IKTmMQdj_C9dDA';
const EMAILJS_CONSUMER_TEMPLATE_ID = 'template_p7vjo2g';

// ── Generate 6-digit OTP ───────────────────────────────────────────────────────
const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── Send OTP via EmailJS ───────────────────────────────────────────────────────
const sendOTPEmail = async (toEmail: string, otp: string): Promise<void> => {
  const payload = {
    service_id:      EMAILJS_SERVICE_ID,
    template_id:     EMAILJS_CONSUMER_TEMPLATE_ID,
    user_id:         EMAILJS_PUBLIC_KEY,
    accessToken:     EMAILJS_PRIVATE_KEY,
    template_params: { to_email: toEmail, otp_code: otp },
  };
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`EmailJS ${response.status}: ${txt}`);
  }
};

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: '', consumerId: '', cnicNumber: '',
    email: '', mobileNumber: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed]                       = useState(false);
  const [loading, setLoading]                     = useState(false);

  const updateField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateForm = () => {
    const { fullName, consumerId, cnicNumber, email, mobileNumber, password, confirmPassword } = form;
    if (!fullName || !consumerId || !cnicNumber || !email || !mobileNumber || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.'); return false;
    }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return false; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return false; }
    if (!agreed) { Alert.alert('Error', 'Please agree to the Terms & Conditions.'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // ── Step 1: Duplicate email check ─────────────────────────────────────────
      const emailSnap = await getDocs(
        query(collection(db, 'consumers'), where('email', '==', form.email))
      );

      if (!emailSnap.empty) {
        const existingDoc = emailSnap.docs[0].data();
        const allMatch =
          existingDoc.fullName    === form.fullName &&
          existingDoc.consumerId  === form.consumerId &&
          existingDoc.cnicNumber  === form.cnicNumber &&
          existingDoc.mobileNumber === form.mobileNumber;

        Alert.alert(
          allMatch ? 'Account Already Exists' : 'Email Already In Use',
          allMatch
            ? 'All your credentials already exist. Please login instead.'
            : 'This email is already registered with a different account.',
          allMatch
            ? [
                { text: 'Go to Login', onPress: () => router.replace('/screens/LoginScreen') },
                { text: 'Cancel', style: 'cancel' },
              ]
            : [{ text: 'OK', style: 'cancel' }]
        );
        setLoading(false);
        return;
      }

      // ── Step 2: Create Firebase Auth user ─────────────────────────────────────
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user           = userCredential.user;

      // ── Step 3: Encrypt password ──────────────────────────────────────────────
      const passwordHash    = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, form.password
      );
      const passwordEncoded = Buffer.from(form.password).toString('base64');

      // ── Step 4: Generate OTP ──────────────────────────────────────────────────
      const otp          = generateOTP();
      const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // ── Step 5: Save consumer to Firestore (unverified) ───────────────────────
      // isVerified = false, lastVerifiedAt = null until OTP confirmed
      await setDoc(doc(db, 'consumers', user.uid), {
        uid:            user.uid,
        fullName:       form.fullName,
        consumerId:     form.consumerId,
        cnicNumber:     form.cnicNumber,
        email:          form.email,
        mobileNumber:   form.mobileNumber,
        role:           'consumer',
        isVerified:     false,
        lastVerifiedAt: null,
        loginOtp:          otp,
        loginOtpExpiresAt: otpExpiresAt,
        passwordHash,
        passwordEncoded,
        createdAt: serverTimestamp(),
      });

      // ── Step 6: Send OTP email ────────────────────────────────────────────────
      try {
        await sendOTPEmail(form.email, otp);
      } catch (emailErr: any) {
        Alert.alert('Email Error', emailErr.message || 'Failed to send OTP.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'OTP Sent',
        `A 6-digit verification code has been sent to ${form.email}. It expires in 10 minutes.`,
        [{ text: 'OK' }]
      );

      // ── Step 7: Go to OTP screen (role = Consumer, registering = true) ────────
      // After OTP verified → isVerified:true, lastVerifiedAt:Date.now() → dashboard
      router.push({
        pathname: '/screens/LoginOTPScreen',
        params: {
          email:         form.email,
          password:      form.password,
          role:          'Consumer',
          consumerDocId: user.uid,
          isRegistering: 'true',   // ← flag so OTP screen goes to dashboard after verify
        },
      });

    } catch (error: any) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          Alert.alert('Email Already In Use', 'This email is already linked to an account.',
            [
              { text: 'Go to Login', onPress: () => router.replace('/screens/LoginScreen') },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;
        case 'auth/invalid-email':
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          Alert.alert('Weak Password', 'Password must be at least 6 characters.');
          break;
        case 'auth/network-request-failed':
          Alert.alert('Network Error', 'Please check your internet connection and try again.');
          break;
        default:
          Alert.alert('Registration Failed', error.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'fullName',     placeholder: 'Enter your full name',       keyboard: 'default' },
    { key: 'consumerId',   placeholder: 'Enter your Consumer ID',     keyboard: 'default' },
    { key: 'cnicNumber',   placeholder: '12345-1234567-1',            keyboard: 'numeric' },
    { key: 'email',        placeholder: 'Enter your email address',   keyboard: 'email-address' },
    { key: 'mobileNumber', placeholder: '+92 300 1234567',            keyboard: 'phone-pad' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join our secure utility analytics platform</Text>

      {fields.map(({ key, placeholder, keyboard }) => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={form[key as keyof typeof form]}
          onChangeText={(v) => updateField(key, v)}
          keyboardType={keyboard as any}
          autoCapitalize="none"
        />
      ))}

      {([
        ['password',        showPassword,        setShowPassword,        'Enter your password'],
        ['confirmPassword', showConfirmPassword, setShowConfirmPassword, 'Re-enter your password'],
      ] as [string, boolean, React.Dispatch<React.SetStateAction<boolean>>, string][]).map(
        ([field, show, setShow, placeholder]) => (
          <View key={field} style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={form[field as keyof typeof form]}
              onChangeText={(v) => updateField(field, v)}
              secureTextEntry={!show}
            />
            <TouchableOpacity onPress={() => setShow(!show)}>
              <Ionicons
                name={show ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        )
      )}

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the{' '}
          <Text style={styles.linkText}>Terms & Conditions</Text>
          {' '}and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
        <Text style={styles.securityText}>
          Your data is protected with end-to-end encryption
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.buttonText}>Create Account</Text>
        }
      </TouchableOpacity>

      <Text style={styles.loginText}>
        Already have an account?{' '}
        <Text style={styles.loginLink} onPress={() => router.push('/screens/LoginScreen')}>
          Login
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28,
    paddingTop: 50, paddingBottom: 40, alignItems: 'center',
  },
  logo:     { width: 72, height: 72, marginBottom: 14 },
  title:    { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 6 },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280',
    marginBottom: 24, textAlign: 'center',
  },
  input: {
    width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular',
    fontSize: 14, color: '#1F2933', marginBottom: 14,
  },
  passwordContainer: {
    width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row',
    alignItems: 'center', marginBottom: 14,
  },
  passwordInput:   { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  checkboxRow:     { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 12, gap: 10 },
  checkbox:        { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#0B3C5D', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#0B3C5D', borderColor: '#0B3C5D' },
  checkboxLabel:   { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', lineHeight: 20 },
  linkText:        { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
  securityNotice:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, width: '100%' },
  securityText:    { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#059669' },
  button:          { width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 20 },
  buttonText:      { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  loginText:       { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  loginLink:       { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
});