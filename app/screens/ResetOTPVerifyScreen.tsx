import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

export default function ResetOTPVerifyScreen() {
  const { email, mobile } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp || otp.length < 4) { Alert.alert('Error', 'Please enter a valid OTP.'); return; }
    setLoading(true);
    try {
      Alert.alert('Verified!', 'Identity verified. You can now reset your password.', [
        { text: 'OK', onPress: () => router.push({ pathname: '/screens/ResetPasswordScreen', params: { email } }) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'OTP verification failed.');
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
        <Ionicons name="phone-portrait-outline" size={36} color="#0B3C5D" />
      </View>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {mobile} to verify your identity.</Text>

      <TextInput style={styles.input} placeholder="Enter OTP" placeholderTextColor="#9CA3AF" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} textAlign="center" />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/screens/LoginScreen')}>
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 70, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1F2933', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  input: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 20, color: '#1F2933', marginBottom: 20, letterSpacing: 6 },
  button: { width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  backText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0B3C5D' },
});