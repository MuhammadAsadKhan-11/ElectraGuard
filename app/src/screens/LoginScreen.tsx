import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthField, AuthScreen, NAVY } from "../../../components/AuthChrome";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
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
import {
  PortalRole,
  requestLoginOtp,
  resetSessionStores,
  resolveLoginEmail,
  signOutEverywhere,
} from "../../../hooks/authSession";

// Login = Firebase password check, then a backend-issued email OTP (EmailJS).
// The OTP is generated, stored (hashed) and verified on the server; a device
// that verified within the last 7 days is trusted and skips the code.

const authErrorMessage = (code: string | undefined, fallback?: string) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    default:
      return fallback || "Authentication failed.";
  }
};

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<"Consumer" | "Admin">("Consumer");
  const [emailOrId, setEmailOrId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");

  // ─── Main login handler ──────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!emailOrId.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    const role: PortalRole = activeTab === "Admin" ? "admin" : "consumer";
    setLoading(true);

    try {
      // Drop whatever the previous account left behind (cached lists, listeners, session).
      resetSessionStores();
      if (auth.currentUser) await signOutEverywhere();

      // 1. Consumer ID -> email (server side; consumers are not publicly readable)
      let email = emailOrId.trim();
      if (role === "consumer" && !email.includes("@")) {
        setStage("Looking up your account…");
        try {
          email = await resolveLoginEmail(email);
        } catch (e: any) {
          Alert.alert("Error", e?.message || "No consumer found with this ID.");
          return;
        }
      }

      // 2. Password check (Firebase Auth)
      setStage("Signing in…");
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        Alert.alert("Login Failed", authErrorMessage(authError?.code, authError?.message));
        return;
      }

      // 3. Email OTP (backend). If it cannot be sent, the sign-in is cancelled.
      setStage("Sending verification code…");
      let otp;
      try {
        otp = await requestLoginOtp(role);
      } catch (e: any) {
        await signOutEverywhere();
        const denied = e instanceof ApiError && e.status === 403;
        Alert.alert(
          denied ? "Access Denied" : "Verification Error",
          e?.message || "Could not send the verification code. Please try again.",
        );
        return;
      }

      if (!otp.required) {
        router.replace((role === "admin" ? "/src/Admin" : "/src/Consumer") as any);
        return;
      }

      router.push({
        pathname: "/src/screens/LoginOTPScreen",
        params: {
          email: otp.maskedEmail || email,
          role,
          expiresIn: String(otp.expiresIn ?? 600),
          resendIn: String(otp.resendIn ?? 60),
        },
      });
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Choose a portal to continue</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "Consumer" && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab("Consumer");
            setEmailOrId("");
            setPassword("");
          }}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color="#111111"
          />
          <Text style={[styles.tabText, activeTab === "Consumer" && styles.tabTextActive]}>
            Consumer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "Admin" && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab("Admin");
            setEmailOrId("");
            setPassword("");
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#111111"
          />
          <Text style={[styles.tabText, activeTab === "Admin" && styles.tabTextActive]}>
            Admin
          </Text>
        </TouchableOpacity>
      </View>

      <AuthField
        icon={activeTab === "Admin" ? "mail-outline" : "id-card-outline"}
        placeholder={
          activeTab === "Admin" ? "Admin email" : "Consumer ID or email"
        }
        value={emailOrId}
        onChangeText={setEmailOrId}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <AuthField
        icon="lock-closed-outline"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        trailing={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#8E8E93"
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.otpNotice}>
        <Ionicons
          name={activeTab === "Admin" ? "shield-checkmark-outline" : "mail-outline"}
          size={16}
          color="#111111"
        />
        <Text style={styles.otpNoticeText}>
          A 6-digit code is emailed to confirm it is you. This device is then trusted for 7 days.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.forgotContainer}
        onPress={() => router.push("/src/screens/ForgotPasswordScreen")}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <>
            <Ionicons name="log-in-outline" size={18} color="#111111" />
            <Text style={styles.loginButtonText}>Continue</Text>
          </>
        )}
      </TouchableOpacity>
      {!!stage && <Text style={styles.stageText}>{stage}</Text>}

      {activeTab === "Consumer" && (
        <Text style={styles.registerText}>
          {"Don't have an account? "}
          <Text
            style={styles.registerLink}
            onPress={() => router.push("/src/screens/RegisterScreen")}
          >
            Create one
          </Text>
        </Text>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  stageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: -6,
    marginBottom: 10,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#111111",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 4,
    marginBottom: 18,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  tabButtonActive: { backgroundColor: NAVY },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#111111" },
  tabTextActive: { color: "#FFFFFF" },
  otpNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
    gap: 8,
  },
  otpNoticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#111111",
    flex: 1,
    lineHeight: 17,
  },
  forgotContainer: { alignSelf: "flex-end", marginTop: 12, marginBottom: 18 },
  forgotText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#111111",
  },
  loginButton: {
    width: "100%",
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  registerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
  },
  registerLink: { color: "#111111", fontFamily: "Inter_600SemiBold" },
});
