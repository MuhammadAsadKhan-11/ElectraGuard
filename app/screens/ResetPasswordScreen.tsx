import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ResetPasswordScreen() {
  const { email, portal } = useLocalSearchParams<{ email: string; portal: string }>();

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);

  const isAdmin = portal === 'admin';
  const accent  = isAdmin ? '#1A73E8' : '#2EC4B6';

  const getStrength = (pass: string) => {
    if (pass.length === 0) return { level: 0, label: '',       color: '#E5E7EB' };
    if (pass.length < 6)   return { level: 1, label: 'Weak',   color: '#EF4444' };
    if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass))
                           return { level: 2, label: 'Fair',   color: '#F59E0B' };
    return                        { level: 3, label: 'Strong', color: accent    };
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
      const collectionName = isAdmin ? 'admins' : 'consumers';

      // ── Step 1: Find user document from Firestore ─────────────────────────────
      const q        = query(collection(db, collectionName), where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert('Error', 'Account not found. Please register first.');
        setLoading(false);
        return;
      }

      const userDoc         = snapshot.docs[0];
      const passwordEncoded = userDoc.data().passwordEncoded;

      if (!passwordEncoded) {
        Alert.alert('Error', 'Unable to verify account. Please contact support.');
        setLoading(false);
        return;
      }

      // ── Step 2: base64 decode to extract current password ───────────────────
      const currentPassword = Buffer.from(passwordEncoded, 'base64').toString('utf8');

      // ── Step 3: Silently sign in to Firebase Auth with current password ───────
      const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);

      // ── Step 4: Update new password in Firebase Auth ──────────────────────────
      await updatePassword(userCredential.user, newPassword);

      // ── Step 5: Create hash and encoded version of the new password ───────────
      const newPasswordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        newPassword
      );
      const newPasswordEncoded = Buffer.from(newPassword).toString('base64');

      // ── Step 6: Update in Firestore ───────────────────────────────────────────
      await updateDoc(doc(db, collectionName, userDoc.id), {
        passwordHash:    newPasswordHash,
        passwordEncoded: newPasswordEncoded,
      });

      // ── Step 7: Sign out — user will do a fresh login ─────────────────────────
      await auth.signOut();

      Alert.alert(
        'Success! 🎉',
        'Your password has been updated. Please login with your new password.',
        [{ text: 'Login Now', onPress: () => router.replace('/screens/LoginScreen') }]
      );

    } catch (error: any) {
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          Alert.alert(
            'Session Expired',
            'Please restart the forgot password process.',
            [{ text: 'OK', onPress: () => router.replace('/screens/LoginScreen') }]
          );
          break;
        case 'auth/too-many-requests':
          Alert.alert('Too Many Attempts', 'Please try again after some time.');
          break;
        case 'auth/network-request-failed':
          Alert.alert('Network Error', 'Please check your internet connection.');
          break;
        default:
          Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
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

      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Your new password must be different from your previous password.
      </Text>

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

      {newPassword.length > 0 && (
        <View style={styles.strengthRow}>
          {[1, 2, 3].map(i => (
            <View
              key={i}
              style={[styles.strengthSegment, { backgroundColor: i <= strength.level ? strength.color : '#E5E7EB' }]}
            />
          ))}
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

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

      {confirmPassword.length > 0 && (
        <View style={styles.matchRow}>
          <Ionicons
            name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={newPassword === confirmPassword ? accent : '#EF4444'}
          />
          <Text style={[styles.matchText, { color: newPassword === confirmPassword ? accent : '#EF4444' }]}>
            {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
          </Text>
        </View>
      )}

      <View style={styles.rulesBox}>
        <Text style={styles.rulesTitle}>Password must contain:</Text>
        {[
          { rule: 'At least 6 characters', met: newPassword.length >= 6 },
          { rule: 'One uppercase letter',  met: /[A-Z]/.test(newPassword) },
          { rule: 'One number',            met: /[0-9]/.test(newPassword) },
        ].map(({ rule, met }) => (
          <View key={rule} style={styles.ruleRow}>
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={met ? accent : '#9CA3AF'}
            />
            <Text style={[styles.ruleText, met && { color: accent }]}>{rule}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, { backgroundColor: accent }]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.confirmButtonText}>Confirm New Password</Text>}
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
  subtitle:          { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 8 },
  label:             { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#374151', alignSelf: 'flex-start', marginBottom: 6 },
  inputWrapper:      { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 },
  input:             { flex: 1, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  eyeBtn:            { paddingHorizontal: 14 },
  strengthRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 4 },
  strengthSegment:   { width: 48, height: 4, borderRadius: 2 },
  strengthLabel:     { fontFamily: 'Inter_500Medium', fontSize: 12 },
  matchRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 4 },
  matchText:         { fontFamily: 'Inter_400Regular', fontSize: 12 },
  rulesBox:          { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 28, gap: 6 },
  rulesTitle:        { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#374151', marginBottom: 4 },
  ruleRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText:          { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },
  confirmButton:     { width: '100%', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  confirmButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  backToLogin:       { fontFamily: 'Inter_500Medium', fontSize: 14 },
});