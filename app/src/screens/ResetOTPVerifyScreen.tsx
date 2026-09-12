import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";

export default function ResetOTPVerifyScreen() {
  // FIX: Receive docId + collectionName instead of raw OTP + expiresAt
  const { email, docId, collectionName, portal } = useLocalSearchParams<{
    email: string;
    docId: string;
    collectionName: string;
    portal: string;
  }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isAdmin = portal === "admin";
  const accent = isAdmin ? "#1A73E8" : "#2EC4B6";

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      // FIX: Fetch OTP from Firestore — never trust URL params for security
      const docSnap = await getDoc(doc(db, collectionName, docId));
      if (!docSnap.exists()) {
        Alert.alert("Error", "Account not found. Please try again.");
        setLoading(false);
        return;
      }

      const data = docSnap.data();
      const storedOtp = data?.resetOtp as string;
      const expiresAt = data?.resetOtpExpiresAt as number;

      if (!storedOtp || !expiresAt) {
        Alert.alert("Error", "No OTP found. Please request a new one.");
        setLoading(false);
        return;
      }

      if (Date.now() > expiresAt) {
        Alert.alert("Expired", "OTP has expired. Please request a new one.");
        setLoading(false);
        return;
      }

      if (otp.trim() !== storedOtp.trim()) {
        Alert.alert("Invalid Code", "The code you entered is incorrect.");
        setLoading(false);
        return;
      }

      // FIX: Clear the OTP from Firestore after successful verification
      await updateDoc(doc(db, collectionName, docId), {
        resetOtp: null,
        resetOtpExpiresAt: null,
      });

      router.replace({
        pathname: "/src/screens/ResetPasswordScreen",
        params: { email, portal: portal ?? "consumer" },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    router.back(); // Back to ForgotPasswordScreen to resend
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={accent} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Verify Code</Text>

      <View style={[styles.iconContainer, { backgroundColor: accent }]}>
        <Ionicons name="shield-checkmark-outline" size={32} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{"\n"}
        <Text style={[styles.emailHighlight, { color: accent }]}>{email}</Text>
      </Text>

      <TextInput
        ref={inputRef}
        style={[styles.otpInput, { borderColor: accent }]}
        placeholder="● ● ● ● ● ●"
        placeholderTextColor="#B0BEC5"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        maxLength={6}
        textAlign="center"
        autoFocus
      />

      <View style={styles.noticeBox}>
        <Ionicons name="time-outline" size={16} color={accent} />
        <Text style={styles.noticeText}>Code expires in 10 minutes</Text>
      </View>

      <TouchableOpacity
        style={[styles.verifyButton, { backgroundColor: accent }]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>{"Didn't receive the code?"} </Text>
        {canResend ? (
          <TouchableOpacity onPress={handleResend}>
            <Text style={[styles.resendLink, { color: accent }]}>Resend</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
        )}
      </View>

      <TouchableOpacity onPress={() => router.push("/src/screens/LoginScreen")}>
        <Text style={[styles.backToLogin, { color: accent }]}>
          Back to Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8 },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#1F2933",
    marginBottom: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#1F2933",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emailHighlight: { fontFamily: "Inter_600SemiBold" },
  otpInput: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#1F2933",
    marginBottom: 16,
    letterSpacing: 12,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B7280",
  },
  verifyButton: {
    width: "100%",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  verifyButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  resendRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  resendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
  },
  resendLink: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  resendCountdown: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#9CA3AF",
  },
  backToLogin: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
