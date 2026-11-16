import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthField, AuthScreen, NAVY, OtpInput } from "../../../components/AuthChrome";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../../firebaseConfig";
import { ApiError } from "../../../hooks/apiClient";
import { PortalRole, requestLoginOtp, signOutEverywhere, verifyLoginOtp } from "../../../hooks/authSession";

// The user is already signed in with their password here; the backend only
// accepts their API calls after this code is verified for this sign-in.
export default function LoginOTPScreen() {
  const params = useLocalSearchParams<{
    email: string;
    role: string;
    expiresIn?: string;
    resendIn?: string;
  }>();

  const email = params.email ?? "";
  const role: PortalRole = String(params.role).toLowerCase() === "admin" ? "admin" : "consumer";
  const isAdmin = role === "admin";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + Number(params.expiresIn || 600) * 1000);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = (seconds: number) => {
    setCountdown(Math.max(0, Math.round(seconds)));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setNow(Date.now());
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  };

  useEffect(() => {
    // No signed-in user means this screen was opened directly: go back to login.
    if (!auth.currentUser) {
      router.replace("/src/screens/LoginScreen");
      return;
    }
    startCountdown(Number(params.resendIn || 60));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expired = now > expiresAt;
  const minutesLeft = Math.max(0, Math.ceil((expiresAt - now) / 60000));

  // ── Resend OTP (server enforces cooldown + hourly limit) ────────────────────
  const handleResendOTP = async () => {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");
    try {
      const res = await requestLoginOtp(role, true);
      setOtp("");
      setExpiresAt(Date.now() + (res.expiresIn ?? 600) * 1000);
      startCountdown(res.resendIn ?? 60);
      Alert.alert("Code Sent", `A new code has been sent to ${res.maskedEmail || email}.`);
    } catch (err: any) {
      const msg = err?.message || "Failed to resend the code.";
      setError(msg);
      if (err instanceof ApiError && err.status === 429) {
        const wait = Number(/(\d+) seconds/.exec(msg)?.[1] ?? 0);
        if (wait) startCountdown(wait);
      }
    } finally {
      setResendLoading(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await verifyLoginOtp(otp.trim());
      router.replace((res.role === "admin" ? "/src/Admin" : "/src/Consumer") as any);
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    try {
      await signOutEverywhere();
    } finally {
      router.canGoBack() ? router.back() : router.replace("/src/screens/LoginScreen");
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{"\n"}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <AuthField icon={isAdmin ? "shield-checkmark-outline" : "mail-outline"} value={email} editable={false} />

      <Text style={styles.codeLabel}>Verification code</Text>
      <OtpInput value={otp} onChangeText={(v: string) => { setOtp(v); if (error) setError(""); }} />
      <View style={[styles.notice, expired && styles.noticeExpired]}>
        <Ionicons name={expired ? "alert-circle-outline" : "time-outline"} size={16} color={expired ? "#B91C1C" : "#111111"} />
        <Text style={[styles.noticeText, expired && { color: "#B91C1C" }]}>
          {expired
            ? "This code has expired. Tap Resend to get a new one."
            : `This code is valid for ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}.`}
        </Text>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, (loading || otp.length < 6) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || otp.length < 6}
      >
<<<<<<< HEAD
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <>
            <Ionicons name="shield-checkmark-outline" size={18} color="#111111" />
            <Text style={styles.buttonText}>Verify and continue</Text>
          </>
=======
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {/* i changed this because it is showing in the heading of the page */}
        {/* <Text style={styles.headerLabel}>
          {isAdmin ? "Admin Authentication" : "Login Authentication"}
        </Text> */}

        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.brandName}>Electra Guard</Text>
        <Text style={styles.subtitle}>
          Utility Theft Detection & Analytics System
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isAdmin ? "Admin Email" : "Email"}</Text>
          <TextInput
            style={styles.input}
            value={email}
            editable={false}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              editable={false}
              secureTextEntry={!showPassword}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Verification Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#9CA3AF"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Text style={styles.otpNote}>
            OTP sent to {email}. Valid for 10 minutes.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.forgotContainer}
          onPress={() => router.push("/src/screens/ForgotPasswordScreen")}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Verify & Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>{"Didn't receive the code? "}</Text>
          {resendLoading ? (
            <ActivityIndicator size="small" color="#0B3C5D" />
          ) : countdown > 0 ? (
            <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResendOTP}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isAdmin && (
          <Text style={styles.registerText}>
            {"Don't have an account? "}
            <Text
              style={styles.registerLink}
              onPress={() => router.push("/src/screens/RegisterScreen")}
            >
              Register Now
            </Text>
          </Text>
>>>>>>> origin/main
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        {resendLoading ? (
          <ActivityIndicator size="small" color="#111111" />
        ) : countdown > 0 ? (
          <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResendOTP}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.backRow} onPress={cancel}>
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
  codeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#374151",
    marginBottom: 10,
    marginTop: 4,
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
    flexShrink: 1,
  },
  noticeExpired: { backgroundColor: "#FEF2F2" },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 12,
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
  resendText: {
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
