// screens/SplashScreen.tsx
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SplashScreen() {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.85);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/screens/LoginScreen'); // Expo Router path
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Image
          source={require('../../assets/Lightning.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>ElectraGuard</Text>
        <Text style={styles.tagline}>
          Advanced Consumer Analytics &{'\n'}Protection Platform
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B3C5D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    tintColor: '#FFFFFF',
  },
  brandName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 22,
  },
});