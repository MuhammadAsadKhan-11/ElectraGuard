import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { updatePassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StatusBar,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth } from '../../firebaseConfig';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);

  // Password strength
  const getStrength = (pass: string) => {
    if (pass.length === 0) return { level: 0, label: '', color: '#E5E7EB' };
    if (pass.length < 6)   return { level: 1, label: 'Weak',   color: '#EF4444' };
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass))
                           return { level: 2, label: 'Fair',   color: '#F59E0B' };
    return                        { level: 3, label: 'Strong', color: '#2EC4B6' };
  };
  const strength = getStrength(newPassword);

  const handleConfirm = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both fields.'); return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.'); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.'); return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;

      if (user) {
        // User is logged in — update directly
        await updatePassword(user, newPassword);
      } else {
        // User not logged in — use Firebase sendPasswordResetEmail flow
        // Since OTP was already verified, we sign in with custom token or
        // inform user to use the reset link sent to email.
        // Best practice: sign user in first via signInWithEmailAndPassword
        // using a temp approach — prompt current password OR use Admin SDK.
        // For this flow (forgot password), Firebase's own reset link is safest.
        Alert.alert(
          'Session Expired',
          'Please use the password reset link sent to your email to set a new password.',
          [{ text: 'OK', onPress: () => router.replace('/screens/LoginScreen') }]
        );
        setLoading(false);
        return;
      }

      Alert.alert('Success! 🎉', 'Your password has been reset successfully.', [
        { text: 'Login Now', onPress: () => router.replace('/screens/LoginScreen') },
      ]);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Session Expired',
          'For security, please log in again and then change your password from settings.',
          [{ text: 'OK', onPress: () => router.replace('/screens/LoginScreen') }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to reset password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Text style={styles.headerTitle}>Reset Password</Text>

      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed-outline" size={32} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Your new password must be different from your previous password.
      </Text>

      {/* New Password */}
      <Text style={styles.label}>New Password</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor="#B0BEC5"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
          <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Strength Bar */}
      {newPassword.length > 0 && (
        <View style={styles.strengthRow}>
          {[1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.strengthSegment,
                { backgroundColor: i <= strength.level ? strength.color : '#E5E7EB' },
              ]}
            />
          ))}
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

      {/* Confirm Password */}
      <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Re-enter new password"
          placeholderTextColor="#B0BEC5"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
          <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Match indicator */}
      {confirmPassword.length > 0 && (
        <View style={styles.matchRow}>
          <Ionicons
            name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={newPassword === confirmPassword ? '#2EC4B6' : '#EF4444'}
          />
          <Text style={[styles.matchText, { color: newPassword === confirmPassword ? '#2EC4B6' : '#EF4444' }]}>
            {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
          </Text>
        </View>
      )}

      {/* Password rules */}
      <View style={styles.rulesBox}>
        <Text style={styles.rulesTitle}>Password must contain:</Text>
        {[
          { rule: 'At least 6 characters', met: newPassword.length >= 6 },
          { rule: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
          { rule: 'One number',           met: /[0-9]/.test(newPassword) },
        ].map(({ rule, met }) => (
          <View key={rule} style={styles.ruleRow}>
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={met ? '#2EC4B6' : '#9CA3AF'}
            />
            <Text style={[styles.ruleText, met && styles.ruleMetText]}>{rule}</Text>
          </View>
        ))}
      </View>

      {/* Confirm Button */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.confirmButtonText}>Confirm New Password</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/screens/LoginScreen')}>
        <Text style={styles.backToLogin}>Back to Login</Text>
      </TouchableOpacity>
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
  inputWrapper: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  eyeBtn: { paddingHorizontal: 14 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 4 },
  strengthSegment: { width: 48, height: 4, borderRadius: 2 },
  strengthLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 4 },
  matchText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  rulesBox: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 28, gap: 6 },
  rulesTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#374151', marginBottom: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },
  ruleMetText: { color: '#2EC4B6' },
  confirmButton: { width: '100%', backgroundColor: '#2EC4B6', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  confirmButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  backToLogin: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#2EC4B6' },
});