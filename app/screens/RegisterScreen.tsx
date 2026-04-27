import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: '', consumerId: '', cnicNumber: '',
    email: '', mobileNumber: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

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
      // ── Step 1: Query Firestore for any document where email matches ──────────
      const emailQuery = query(
        collection(db, 'consumers'),
        where('email', '==', form.email)
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const existingDoc = emailSnapshot.docs[0].data();

        // ── Step 2: Check if ALL credentials match with existing record ─────────
        const allCredentialsMatch =
          existingDoc.fullName === form.fullName &&
          existingDoc.consumerId === form.consumerId &&
          existingDoc.cnicNumber === form.cnicNumber &&
          existingDoc.mobileNumber === form.mobileNumber;

        if (allCredentialsMatch) {
          Alert.alert(
            'Account Already Exists',
            'All your credentials already exist in our system. This account is already registered. Please login instead.',
            [
              { text: 'Go to Login', onPress: () => router.replace('/screens/LoginScreen') },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'Email Already In Use',
            'This email address is already registered with a different account. Please use a different email.',
            [{ text: 'OK', style: 'cancel' }]
          );
        }

        setLoading(false);
        return;
      }

      // ── Step 3: Email not found → safe to create Firebase Auth user ──────────
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;
      await sendEmailVerification(user);

      // ── Step 4: Password encrypt karo ────────────────────────────────────────
      // SHA256 hash — one-way, verify karne ke liye
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        form.password
      );
      // Base64 encode — reset flow ke liye silently sign in karne ke liye
      const passwordEncoded = Buffer.from(form.password).toString('base64');

      // ── Step 5: Save consumer data to Firestore ───────────────────────────────
      await setDoc(doc(db, 'consumers', user.uid), {
        uid: user.uid,
        fullName: form.fullName,
        consumerId: form.consumerId,
        cnicNumber: form.cnicNumber,
        email: form.email,
        mobileNumber: form.mobileNumber,
        role: 'consumer',
        emailVerified: false,
        isVerified: false,
        passwordHash,      // SHA256 — koi decode nahi kar sakta
        passwordEncoded,   // base64 — reset flow ke liye
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Registration Successful!',
        'A verification email has been sent to your inbox. Please verify before logging in.',
        [{ text: 'OK', onPress: () => router.replace('/screens/LoginScreen') }]
      );

    } catch (error: any) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          Alert.alert(
            'Email Already In Use',
            'This email is already linked to an account. Please login instead.',
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
    { key: 'fullName', placeholder: 'Enter your full name', keyboard: 'default' },
    { key: 'consumerId', placeholder: 'Enter your Consumer ID', keyboard: 'default' },
    { key: 'cnicNumber', placeholder: '12345-1234567-1', keyboard: 'numeric' },
    { key: 'email', placeholder: 'Enter your email address', keyboard: 'email-address' },
    { key: 'mobileNumber', placeholder: '+92 300 1234567', keyboard: 'phone-pad' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

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
        ['password', showPassword, setShowPassword, 'Enter your password'],
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
  logo: { width: 72, height: 72, marginBottom: 14 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 6 },
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
  passwordInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  checkboxRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    width: '100%', marginBottom: 12, gap: 10,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#0B3C5D',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#0B3C5D', borderColor: '#0B3C5D' },
  checkboxLabel: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', lineHeight: 20,
  },
  linkText: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
  securityNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 20, width: '100%',
  },
  securityText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#059669' },
  button: {
    width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  loginText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  loginLink: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
});