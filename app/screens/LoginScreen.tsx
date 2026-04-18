import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { auth } from '../../firebaseConfig';

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'Consumer' | 'Admin'>('Consumer');
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrId || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailOrId, password);
      router.push({
        pathname: '/screens/LoginOTPScreen',
        params: { email: emailOrId, password, role: activeTab },
      });
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brandName}>Electra Guard</Text>
      <Text style={styles.subtitle}>Utility Theft Detection & Analytics System</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Consumer' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Consumer')}
        >
          <Text style={[styles.tabText, activeTab === 'Consumer' && styles.tabTextActive]}>Consumer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Admin' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Admin')}
        >
          <Text style={[styles.tabText, activeTab === 'Admin' && styles.tabTextActive]}>Admin</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter your Consumer ID or Email"
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
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.forgotContainer} onPress={() => router.push('/screens/ForgotPasswordScreen')}>
        <Text style={styles.forgotText}>Forget Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Continue</Text>}
      </TouchableOpacity>

      <Text style={styles.registerText}>
        Don't have an account?{' '}
        <Text style={styles.registerLink} onPress={() => router.push('/screens/RegisterScreen')}>
          Register Now
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', alignItems: 'center', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  logo: { width: 70, height: 70, marginBottom: 12 },
  brandName: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 20, width: '100%' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabButtonActive: { backgroundColor: '#0B3C5D' },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0B3C5D' },
  tabTextActive: { color: '#FFFFFF' },
  input: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933', marginBottom: 14 },
  passwordContainer: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  passwordInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  forgotContainer: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#0B3C5D' },
  loginButton: { width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 20 },
  loginButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  registerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  registerLink: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
});