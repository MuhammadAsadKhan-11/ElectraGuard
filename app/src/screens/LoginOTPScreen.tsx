import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Timestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";

const EMAILJS_SERVICE_ID = "service_wynnt38";
const EMAILJS_PUBLIC_KEY = "hMZkNajE1DpuQeOMQ";
const EMAILJS_PRIVATE_KEY = "n5Zknt7IKTmMQdj_C9dDA";
const EMAILJS_CONSUMER_TEMPLATE_ID = "template_p7vjo2g";
const EMAILJS_ADMIN_TEMPLATE_ID = "template_kx85hs2";

export default function LoginOTPScreen() {
  const params = useLocalSearchParams<{
    email: string;
    password: string;
    role: string;
    consumerDocId?: string;
    adminDocId?: string;
    isRegistering?: string;
  }>();

  const {
    email,
    password,
    role,
    consumerDocId = "",
    adminDocId = "",
    isRegistering = "false",
  } = params;

  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = role === "Admin";
  const firestoreCol = isAdmin ? "admins" : "consumers";
  const docId = isAdmin ? adminDocId : consumerDocId;
  const templateId = isAdmin
    ? EMAILJS_ADMIN_TEMPLATE_ID
    : EMAILJS_CONSUMER_TEMPLATE_ID;

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = Date.now() + 10 * 60 * 1000;

      await updateDoc(doc(db, firestoreCol, docId), {
        loginOtp: newOtp,
        loginOtpExpiresAt: otpExpiresAt,
        isVerified: false,
        lastVerifiedAt: null,
      });

      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: templateId,
            user_id: EMAILJS_PUBLIC_KEY,
            accessToken: EMAILJS_PRIVATE_KEY,
            template_params: { to_email: email, otp_code: newOtp },
          }),
        },
      );

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`EmailJS error: ${txt}`);
      }

      Alert.alert("OTP Sent", `A new OTP has been sent to ${email}.`);
      startCountdown();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Verify OTP & Login ───────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const docRef = doc(db, firestoreCol, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Alert.alert(
          "Error",
          `${isAdmin ? "Admin" : "Consumer"} record not found.`,
        );
        setLoading(false);
        return;
      }

      const data = docSnap.data();
      const storedOtp = data?.loginOtp as string;
      const expiresAt = data?.loginOtpExpiresAt as number;

      if (Date.now() > expiresAt) {
        Alert.alert(
          "OTP Expired",
          "Your OTP has expired. Please request a new one.",
        );
        setLoading(false);
        return;
      }

      if (otp.trim() !== storedOtp) {
        Alert.alert("Invalid OTP", "The OTP you entered is incorrect.");
        setLoading(false);
        return;
      }

      // OTP valid — sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);

      // Update Firestore: mark verified, clear OTP
      await updateDoc(docRef, {
        isVerified: true,
        lastVerifiedAt: Timestamp.now().toMillis(),
        loginOtp: null,
        loginOtpExpiresAt: null,
      });

      router.replace((isAdmin ? "/src/Admin" : "/src/Consumer") as any);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <Text style={styles.headerLabel}>
          {isAdmin ? "Admin Authentication" : "Login Authentication"}
        </Text>

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
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#9CA3AF",
    alignSelf: "flex-start",
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#0B3C5D",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: { width: 40, height: 40 },
  brandName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#1F2933",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 28,
    textAlign: "center",
  },
  inputGroup: { width: "100%", marginBottom: 14 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(107, 114, 128, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#1F2933",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.15)",
  },
  passwordContainer: {
    width: "100%",
    backgroundColor: "rgba(107, 114, 128, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.15)",
  },
  passwordInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#1F2933",
  },
  otpNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#6B7280",
    marginTop: 6,
  },
  forgotContainer: { alignSelf: "flex-end", marginBottom: 20, marginTop: 4 },
  forgotText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#0B3C5D",
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#0B3C5D",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  resendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
  },
  resendLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#0B3C5D",
  },
  resendCountdown: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#9CA3AF",
  },
  registerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
  },
  registerLink: { color: "#0B3C5D", fontFamily: "Inter_600SemiBold" },
});
