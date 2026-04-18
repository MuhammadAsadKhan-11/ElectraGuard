import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
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

  const updateField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

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
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      await setDoc(doc(db, 'consumers', user.uid), {
        uid: user.uid, fullName: form.fullName, consumerId: form.consumerId,
        cnicNumber: form.cnicNumber, email: form.email, mobileNumber: form.mobileNumber,
        role: 'consumer', emailVerified: false, createdAt: serverTimestamp(),
      });
      Alert.alert('Registration Successful!', 'A verification email has been sent.', [
        { text: 'OK', onPress: () => router.replace('/screens/LoginScreen') }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join our secure utility analytics platform</Text>

      {['fullName', 'consumerId', 'cnicNumber', 'email', 'mobileNumber'].map((field) => (
        <TextInput
          key={field}
          style={styles.input}
          placeholder={field === 'fullName' ? 'Enter your full name' : field === 'consumerId' ? 'Enter your Consumer ID' : field === 'cnicNumber' ? '12345-1234567-1' : field === 'email' ? 'Enter your email address' : '+92 300 1234567'}
          placeholderTextColor="#9CA3AF"
          value={form[field as keyof typeof form]}
          onChangeText={(v) => updateField(field, v)}
          keyboardType={field === 'email' ? 'email-address' : field === 'mobileNumber' ? 'phone-pad' : field === 'cnicNumber' ? 'numeric' : 'default'}
          autoCapitalize="none"
        />
      ))}

      {[['password', showPassword, setShowPassword], ['confirmPassword', showConfirmPassword, setShowConfirmPassword]].map(([field, show, setShow]: any) => (
        <View key={field} style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={field === 'password' ? 'Enter your password' : 'Re-enter your password'}
            placeholderTextColor="#9CA3AF"
            value={form[field as keyof typeof form]}
            onChangeText={(v) => updateField(field, v)}
            secureTextEntry={!show}
          />
          <TouchableOpacity onPress={() => setShow(!show)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      <Text style={styles.loginText}>
        Already have an account?{' '}
        <Text style={styles.loginLink} onPress={() => router.push('/screens/LoginScreen')}>Login</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#1F2933', marginBottom: 6 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  input: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933', marginBottom: 14 },
  passwordContainer: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  passwordInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 24, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#0B3C5D', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#0B3C5D', borderColor: '#0B3C5D' },
  checkboxLabel: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', lineHeight: 20 },
  linkText: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
  button: { width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 20 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  loginText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  loginLink: { color: '#0B3C5D', fontFamily: 'Inter_600SemiBold' },
});