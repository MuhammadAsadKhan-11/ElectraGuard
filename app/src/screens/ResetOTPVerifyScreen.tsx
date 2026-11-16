import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthScreen, NAVY, OtpInput } from "../../../components/AuthChrome";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { requestResetCode, verifyResetCode } from "../../../hooks/authSession";

export default function ResetOTPVerifyScreen() {
  const { identifier, email, portal, resendIn } = useLocalSearchParams<{
    identifier: string;
    email: string;
    portal: string;
    resendIn?: string;
  }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(Number(resendIn || 60));
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }
    if (!identifier) {
      Alert.alert("Error", "Please start the password reset again.");
      router.replace("/src/screens/ForgotPasswordScreen");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyResetCode(String(identifier), otp.trim());
      router.replace({
        pathname: "/src/screens/ResetPasswordScreen",
        params: { email: res.email, portal: res.portal ?? portal ?? "consumer" },
      });
    } catch (error: any) {
      setOtp("");
      Alert.alert("Invalid Code", error?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!identifier || resending) return;
    setResending(true);
    try {
      const res = await requestResetCode(String(identifier), true);
      setCanResend(false);
      setCountdown(res.resendIn ?? 60);
      Alert.alert("Code Sent", `A new code has been sent to ${res.maskedEmail || email}.`);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{"\n"}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <OtpInput value={otp} onChangeText={setOtp} />

      <View style={styles.notice}>
        <Ionicons name="time-outline" size={16} color="#111111" />
        <Text style={styles.noticeText}>This code expires in 10 minutes.</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (loading || otp.length < 6) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || otp.length < 6}
      >
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <>
            <Ionicons name="shield-checkmark-outline" size={18} color="#111111" />
            <Text style={styles.buttonText}>Verify code</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>Didn't receive the code? </Text>
        {canResend ? (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
        )}
      </View>

      <TouchableOpacity style={styles.backRow} onPress={() => router.push("/src/screens/LoginScreen")}>
        <Ionicons name="arrow-back" size={16} color="#111111" />
        <Text style={styles.backText}>Back to sign in</Text>
      </TouchableOpacity>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#111111",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 18,
  },
  emailHighlight: {
    color: NAVY,
    fontFamily: "Inter_600SemiBold",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: NAVY,
  },
  button: {
    width: "100%",
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
  },
  resendLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: NAVY,
  },
  resendCountdown: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#8E8E93",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  backText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: NAVY,
  },
});
