import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { AppSettingsProvider } from '../hooks/AppSettingContext';

export { ErrorBoundary } from 'expo-router';

// ─────────────────────────────────────────────────────────────
// RTL FIX: app ko hamesha LTR rakho, chahe pehle kisi screen ne
// (ya Arabic language select hone par) RTL force kar diya ho.
// Yeh component render hone se PEHLE, module load hote hi chalta hai.
// Flag yahan set hoga, lekin poora effect agle app-restart par aayega
// (RTL native layer mein stored hoti hai, hot-reload se nahi badalti).
// ─────────────────────────────────────────────────────────────
if (I18nManager.isRTL || I18nManager.allowRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_600SemiBold,
    Poppins_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  return (
    <AppSettingsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="src/Admin" />
        <Stack.Screen name="src/Consumer" />
        <Stack.Screen name="src/(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="src/screens/SplashScreen" />
        <Stack.Screen name="src/screens/LoginScreen" />
        <Stack.Screen name="src/screens/RegisterScreen" />
        <Stack.Screen name="src/screens/ForgotPasswordScreen" />
        <Stack.Screen name="src/screens/LoginOTPScreen" />
        <Stack.Screen name="src/screens/ResetOTPVerifyScreen" />
        <Stack.Screen name="src/screens/ResetPasswordScreen" />
      </Stack>
    </AppSettingsProvider>
  );
}