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
      if (isSignInWithEmailLink(auth, url)) {
        try {
          const email = await AsyncStorage.getItem('adminEmailForLink');
          if (email) {
            await signInWithEmailLink(auth, email, url);
            await AsyncStorage.removeItem('adminEmailForLink');
            router.replace('/Admin');
          }
        } catch (e) {
          console.error('Magic link error:', e);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleMagicLink(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleMagicLink(url));
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
        <Stack.Screen name="Admin" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="screens/SplashScreen" />
        <Stack.Screen name="screens/LoginScreen" />
        <Stack.Screen name="screens/RegisterScreen" />
        <Stack.Screen name="screens/ForgotPasswordScreen" />
        <Stack.Screen name="screens/LoginOTPScreen" />
        <Stack.Screen name="screens/ResetOTPVerifyScreen" />
        {/* <Stack.Screen name="screens/ResetPasswordScreen" />  ← YEH ADD KARO */}
      </Stack>
    </>
  );
}