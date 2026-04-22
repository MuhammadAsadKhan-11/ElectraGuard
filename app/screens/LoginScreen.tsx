import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection, doc, getDocs, onSnapshot,
  query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const EMAILJS_SERVICE_ID = 'service_wynnt38';
const EMAILJS_TEMPLATE_ID = 'template_kx85hs2';
const EMAILJS_PUBLIC_KEY = 'hMZkNajE1DpuQeOMQ';
const EMAILJS_PRIVATE_KEY = 'YOUR_PRIVATE_KEY_HERE'; // EmailJS Dashboard > Account > API Keys

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'Consumer' | 'Admin'>('Consumer');
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitingVerification, setWaitingVerification] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const listenForVerification = (adminDocId: string) => {
    setWaitingVerification(true);

    const unsub = onSnapshot(doc(db, 'admins', adminDocId), async (snap) => {
      if (snap.exists() && snap.data()?.sessionVerified === true) {
        unsub();
        unsubscribeRef.current = null;
        setWaitingVerification(false);

        await updateDoc(doc(db, 'admins', adminDocId), {
          sessionVerified: false,
        });

        router.replace('/Admin/AdminDashBoard');
      }
    });

    unsubscribeRef.current = unsub;

    setTimeout(() => {
      unsub();
      setWaitingVerification(false);
      Alert.alert('Timeout', 'Verification link expired. Please login again.');
    }, 15 * 60 * 1000);
  };

  const sendVerificationEmail = async (toEmail: string, verifyLink: string): Promise<void> => {
    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: toEmail,
        verify_link: verifyLink,
      },
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'origin': 'http://localhost',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('EmailJS response:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`EmailJS ${response.status}: ${responseText}`);
    }
  };

  const handleLogin = async () => {
    if (!emailOrId || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);

    try {
      if (activeTab === 'Admin') {

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, emailOrId, password);
        } catch (authError: any) {
          if (
            authError.code === 'auth/invalid-credential' ||
            authError.code === 'auth/wrong-password' ||
            authError.code === 'auth/user-not-found'
          ) {
            Alert.alert('Login Failed', 'Invalid email or password.');
          } else {
            Alert.alert('Login Failed', authError.message || 'Authentication failed.');
          }
          setLoading(false);
          return;
        }

        const user = userCredential.user;

        const adminQuery = query(collection(db, 'admins'), where('uid', '==', user.uid));
        const adminSnapshot = await getDocs(adminQuery);

        if (adminSnapshot.empty) {
          Alert.alert('Access Denied', 'You are not authorized as an Admin.');
          await auth.signOut();
          setLoading(false);
          return;
        }

        const adminDocId = adminSnapshot.docs[0].id;
        await auth.signOut();

        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expiresAt = Date.now() + 15 * 60 * 1000;

        await setDoc(doc(db, 'adminVerifyTokens', token), {
          uid: user.uid,
          adminDocId,
          email: emailOrId,
          expiresAt,
          used: false,
        });

        const verifyLink = `https://electraguard-43b18.web.app/verify.html?token=${token}`;

        try {
          await sendVerificationEmail(emailOrId, verifyLink);
        } catch (emailError: any) {
          Alert.alert('Email Error', emailError.message || 'Failed to send email.');
          setLoading(false);
          return;
        }

        Alert.alert(
          'Verification Email Sent',
          `Check your email ${emailOrId} and click "Verify & Login" button.`,
          [{ text: 'OK' }]
        );

        listenForVerification(adminDocId);

      } else {
        let loginEmail = emailOrId;

        if (!emailOrId.includes('@')) {
          const consumerQuery = query(
            collection(db, 'consumers'),
            where('consumerId', '==', emailOrId)
          );
          const snapshot = await getDocs(consumerQuery);
          if (snapshot.empty) {
            Alert.alert('Error', 'No consumer found with this ID.');
            setLoading(false);
            return;
          }
          loginEmail = snapshot.docs[0].data().email;
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
        router.push({
          pathname: '/screens/LoginOTPScreen',
          params: { email: loginEmail, password, role: 'Consumer' },
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (waitingVerification) {
    return (
      <View style={styles.waitingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.waitingCard}>
          <Text style={styles.waitingEmoji}>✉️</Text>
          <Text style={styles.waitingTitle}>Check Your Email</Text>
          <Text style={styles.waitingSubtitle}>Verification link sent to:</Text>
          <Text style={styles.waitingEmail}>{emailOrId}</Text>
          <Text style={styles.waitingInstruction}>
            {'Click '}
            <Text style={{ fontWeight: 'bold', color: '#0B3C5D' }}>
              {'"Verify & Login"'}
            </Text>
            {' in your email \u2014 you will be automatically logged in here.'}
          </Text>
          <ActivityIndicator size="large" color="#0B3C5D" style={{ marginTop: 24 }} />
          <Text style={styles.waitingTimer}>Waiting for verification...</Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              if (unsubscribeRef.current) unsubscribeRef.current();
              setWaitingVerification(false);
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brandName}>Electra Guard</Text>
      <Text style={styles.subtitle}>Utility Theft Detection & Analytics System</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Consumer' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('Consumer'); setEmailOrId(''); setPassword(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'Consumer' && styles.tabTextActive]}>
            Consumer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Admin' && styles.tabButtonActive]}
          onPress={() => { setActiveTab('Admin'); setEmailOrId(''); setPassword(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'Admin' && styles.tabTextActive]}>
            Admin
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={
          activeTab === 'Admin' ? 'Enter Admin Email' : 'Enter your Consumer ID or Email'
        }
        placeholderTextColor="#9CA3AF"
        value={emailOrId}
        onChangeText={setEmailOrId}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {activeTab === 'Admin' && (
        <View style={styles.adminNotice}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#0B3C5D" />
          <Text style={styles.adminNoticeText}>
            A verification link will be sent to your email after login.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.forgotContainer}
        onPress={() => router.push('/screens/ForgotPasswordScreen')}
      >
        <Text style={styles.forgotText}>Forget Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.loginButtonText}>Continue</Text>
        }
      </TouchableOpacity>

      {activeTab === 'Consumer' && (
        <Text style={styles.registerText}>
          {'Don\'t have an account? '}
          <Text
            style={styles.registerLink}
            onPress={() => router.push('/screens/RegisterScreen')}
          >
            Register Now
          </Text>
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#FFFFFF', alignItems: 'center',
    paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40,
  },
  logo: { width: 70, height: 70, marginBottom: 12 },
  brandName: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 4 },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280',
    marginBottom: 24, textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8,
    padding: 4, marginBottom: 20, width: '100%',
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabButtonActive: { backgroundColor: '#0B3C5D' },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0B3C5D' },
  tabTextActive: { color: '#FFFFFF' },
  input: {
    width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular',
    fontSize: 14, color: '#1F2933', marginBottom: 14,
  },
  passwordContainer: {
    width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row',
    alignItems: 'center', marginBottom: 8,
  },
  passwordInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  adminNotice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    borderRadius: 8, padding: 10, width: '100%', marginTop: 8, gap: 6,
  },
  adminNoticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#0B3C5D', flex: 1 },
  forgotContainer: { alignSelf: 'flex-end', marginBottom: 24, marginTop: 8 },
  forgotText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0B3C5D' },
  loginButton: {
    width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  loginButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  registerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  registerLink: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
  waitingContainer: {
    flex: 1, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  waitingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  waitingEmoji: { fontSize: 48, marginBottom: 16 },
  waitingTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1F2933', marginBottom: 8 },
  waitingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
  waitingEmail: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0B3C5D',
    marginTop: 4, marginBottom: 16,
  },
  waitingInstruction: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280',
    textAlign: 'center', lineHeight: 20,
  },
  waitingTimer: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF', marginTop: 12,
  },
  cancelBtn: { marginTop: 24, padding: 10 },
  cancelText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#DC2626' },
});