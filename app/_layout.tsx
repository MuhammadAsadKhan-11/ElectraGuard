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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { auth } from '../firebaseConfig';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_600SemiBold,
    Poppins_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    const handleMagicLink = async (url: string) => {
      console.log('🔗 URL received:', url);

      if (isSignInWithEmailLink(auth, url)) {
        console.log('✅ Valid magic link!');
        try {
          const email = await AsyncStorage.getItem('adminEmailForLink');
          console.log('📧 Saved email:', email);

          if (email) {
            await signInWithEmailLink(auth, email, url);
            await AsyncStorage.removeItem('adminEmailForLink');
            console.log('✅ Sign in success! Going to Dashboard...');
            router.replace('/Admin/AdminDashBoard');
          }
        } catch (e) {
          console.error('❌ Magic link error:', e);
        }
      }
    };

    // App band thi aur link se khuli
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 Initial URL:', url);
        handleMagicLink(url);
      }
    });

    // App already open thi background mein
    const sub = Linking.addEventListener('url', ({ url }) => {
      console.log('📲 Deep link received:', url);
      handleMagicLink(url);
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0B3C5D" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="screens/SplashScreen" />
        <Stack.Screen name="screens/LoginScreen" />
        <Stack.Screen name="screens/RegisterScreen" />
        <Stack.Screen name="screens/ForgotPasswordScreen" />
        <Stack.Screen name="screens/LoginOTPScreen" />
        <Stack.Screen name="screens/ResetOTPVerifyScreen" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}