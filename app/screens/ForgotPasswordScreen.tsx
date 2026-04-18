import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ForgotPasswordScreen() {
  const [consumerIdOrEmail, setConsumerIdOrEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!consumerIdOrEmail || !mobileNumber) {
      Alert.alert('Error', 'Please fill in all fields.'); return;
    }
    setLoading(true);
    try {
      let foundEmail = '';
      if (consumerIdOrEmail.includes('@')) {
        foundEmail = consumerIdOrEmail;
      } else {
        const q = query(collection(db, 'consumers'), where('consumerId', '==', consumerIdOrEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          if (userData.mobileNumber !== mobileNumber) {
            Alert.alert('Error', 'Mobile number does not match.'); setLoading(false); return;
          }
          foundEmail = userData.email;
        } else {
          Alert.alert('Error', 'No account found.'); setLoading(false); return;
        }
      }
      await sendPasswordResetEmail(auth, foundEmail);
      Alert.alert('OTP Sent', `Password reset link sent to your email.`, [
        { text: 'OK', onPress: () => router.push({ pathname: '/screens/ResetOTPVerifyScreen', params: { email: foundEmail, mobile: mobileNumber } }) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#0B3C5D" />
      </TouchableOpacity>
      <View style={styles.iconContainer}>
        <Ionicons name="mail-outline" size={36} color="#0B3C5D" />
      </View>
      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>Enter your registered email or Consumer ID and mobile number.</Text>

      <TextInput style={styles.input} placeholder="Enter your Consumer ID or Email" placeholderTextColor="#9CA3AF" value={consumerIdOrEmail} onChangeText={setConsumerIdOrEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Enter mobile number" placeholderTextColor="#9CA3AF" value={mobileNumber} onChangeText={setMobileNumber} keyboardType="phone-pad" maxLength={13} />

      <View style={styles.noticeBox}>
        <Ionicons name="lock-closed-outline" size={16} color="#0B3C5D" />
        <Text style={styles.noticeText}>By clicking Send OTP, you authorize us to verify your identity.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send OTP</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/screens/LoginScreen')}>
        <Text style={styles.backToLogin}>Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 70, paddingBottom: 40, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 8 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1F2933', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  input: { width: '100%', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1F2933', marginBottom: 14 },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, width: '100%', marginBottom: 24, gap: 8 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#0B3C5D', lineHeight: 18 },
  button: { width: '100%', backgroundColor: '#0B3C5D', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  backToLogin: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0B3C5D', marginBottom: 20, textAlign: 'center' },
});