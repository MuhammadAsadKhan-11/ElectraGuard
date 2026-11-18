// screens/SplashScreen.tsx
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth } from "../../../firebaseConfig";
import { endRestoredSession } from "../../../hooks/authSession";

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

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

    let cancelled = false;
    let handled = false;
    // Every app start shows the Login screen. A session left over from the last
    // time the app was used is signed out (and revoked on the backend) first,
    // so the app never opens straight into a portal.
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled || handled) return;
      handled = true;
      if (user) {
        try {
          await endRestoredSession(); // local sign-out is immediate
        } catch {
          // ignore
        }
      }
      if (!cancelled) router.replace("/src/screens/LoginScreen");
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Image
          source={require("../../../assets/Lightning.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>ElectraGuard</Text>
        <Text style={styles.tagline}>
          Advanced Consumer Analytics &{"\n"}Protection Platform
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B3C5D",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    tintColor: "#FFFFFF",
  },
  brandName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.85,
    lineHeight: 22,
  },
});
