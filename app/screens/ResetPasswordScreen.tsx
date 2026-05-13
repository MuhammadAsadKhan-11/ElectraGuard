import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
  StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { auth } from '../../firebaseConfig';

export default function ResetPasswordScreen() {
  const { email, portal } = useLocalSearchParams<{ email: string; portal: string }>();

  const [loading, setLoading] = useState(false);

  const isAdmin = portal === 'admin';
  const accent  = isAdmin ? '#1A73E8' : '#2EC4B6';

  // FIX: Use Firebase's built-in password reset email — no stored passwords needed.
  // This is the correct, secure pattern. Firebase emails a reset link directly to the user.
  const handleConfirm = async () => {
    if (!email) {
      Alert.alert('Error', 'Email not found. Please restart the process.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Email Sent! 📧',
        `A password reset link has been sent to ${email}. Please check your inbox and follow the link to set a new password.`,
        [{ text: 'Back to Login', onPress: () => router.replace('/screens/LoginScreen') }]
      );
    } catch (error: any) {
      switch (error.code) {
        case 'auth/user-not-found':
          Alert.alert('Error', 'No account found with this email.');
          break;
        case 'auth/invalid-email':
          Alert.alert('Error', 'Invalid email address.');
          break;
        case 'auth/too-many-requests':
          Alert.alert('Too Many Attempts', 'Please try again after some time.');
          break;
        case 'auth/network-request-failed':
          Alert.alert('Network Error', 'Please check your internet connection.');
          break;
        default:
          Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Text style={styles.headerTitle}>Reset Password</Text>

      <View style={[styles.iconContainer, { backgroundColor: accent }]}>
        <Ionicons name="lock-closed-outline" size={32} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        We'll send a secure password reset link to:
      </Text>

      <View style={[styles.emailBox, { borderColor: accent }]}>
        <Ionicons name="mail-outline" size={18} color={accent} />
        <Text style={[styles.emailText, { color: accent }]}>{email}</Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        <Text style={styles.infoText}>
          Firebase will send you a secure link to reset your password. The link expires after a short time for your security.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, { backgroundColor: accent }]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.confirmButtonText}>Send Reset Link</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/screens/LoginScreen')}>
        <Text style={[styles.backToLogin, { color: accent }]}>Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flexGrow: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  headerTitle:       { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1F2933', marginBottom: 32 },
  iconContainer:     { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title:             { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 10, textAlign: 'center' },
  subtitle:          { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 16, paddingHorizontal: 8 },
  emailBox:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, width: '100%', marginBottom: 24, backgroundColor: '#F9FAFB' },
  emailText:         { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  infoBox:           { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, width: '100%', marginBottom: 28 },
  infoText:          { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', flex: 1, lineHeight: 18 },
  confirmButton:     { width: '100%', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  confirmButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  backToLogin:       { fontFamily: 'Inter_500Medium', fontSize: 14 },
});