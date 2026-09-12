import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";

// ── EmailJS Config ─────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID = "service_wynnt38";
const EMAILJS_PUBLIC_KEY = "hMZkNajE1DpuQeOMQ";
const EMAILJS_PRIVATE_KEY = "n5Zknt7IKTmMQdj_C9dDA";
const EMAILJS_CONSUMER_TEMPLATE_ID = "template_p7vjo2g";
const EMAILJS_ADMIN_TEMPLATE_ID = "template_kx85hs2";

// ── 1-week verification window (in milliseconds) ──────────────────────────────
const VERIFICATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// ─── EmailJS sender ────────────────────────────────────────────────────────────
const sendEmail = async (
  toEmail: string,
  templateId: string,
  templateParams: Record<string, string>,
): Promise<void> => {
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: EMAILJS_PUBLIC_KEY,
    accessToken: EMAILJS_PRIVATE_KEY,
    template_params: { to_email: toEmail, ...templateParams },
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log("EmailJS response:", response.status, responseText);

  if (!response.ok)
    throw new Error(`EmailJS ${response.status}: ${responseText}`);
};

// ─── Generate 6-digit OTP ──────────────────────────────────────────────────────
const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─── FIX 1: Check 1-week verified window (device clock safe) ──────────────────
const isWithinVerifiedWindow = (docData: Record<string, any>): boolean => {
  if (!docData.isVerified) return false;
  if (!docData.lastVerifiedAt) return false;

  const now = Date.now();
  const lastVerifiedAt = docData.lastVerifiedAt;

  // If it's 0 → consider it invalid, send OTP
  if (lastVerifiedAt <= 0) return false;
  if (lastVerifiedAt > now + 60_000) return false; // 1 min tolerance

  const elapsed = now - lastVerifiedAt;
  return elapsed < VERIFICATION_WINDOW_MS;
};

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<"Consumer" | "Admin">("Consumer");
  const [emailOrId, setEmailOrId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // ─── Main login handler ──────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!emailOrId || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);

    try {
      // ════════════════════════════════════════════════════════════════════════
      // ADMIN FLOW
      // ════════════════════════════════════════════════════════════════════════
      if (activeTab === "Admin") {
        // FIX 2: Keep admin email as-is, just trim it
        const adminEmail = emailOrId.trim();

        // 1. Firebase Auth — sign in to validate password
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(
            auth,
            adminEmail,
            password,
          );
        } catch (authError: any) {
          if (
            authError.code === "auth/invalid-credential" ||
            authError.code === "auth/wrong-password" ||
            authError.code === "auth/user-not-found"
          ) {
            Alert.alert("Login Failed", "Invalid email or password.");
          } else {
            Alert.alert(
              "Login Failed",
              authError.message || "Authentication failed.",
            );
          }
          setLoading(false);
          return;
        }

        // 2. Admins collection check
        const adminSnap = await getDocs(
          query(
            collection(db, "admins"),
            where("uid", "==", userCredential.user.uid),
          ),
        );

        if (adminSnap.empty) {
          Alert.alert("Access Denied", "You are not authorized as an Admin.");
          await auth.signOut();
          setLoading(false);
          return;
        }

        const adminDocId = adminSnap.docs[0].id;
        const adminDocData = adminSnap.docs[0].data();

        // ── Check 1-week window ───────────────────────────────────────────────
        if (isWithinVerifiedWindow(adminDocData)) {
          console.log("Admin already verified within 1 week, skipping OTP.");
          router.replace("/src/Admin" as any);
          setLoading(false);
          return;
        }

        // 3. Not within window → sign out, then send OTP
        await auth.signOut();

        const otp = generateOTP();
        const otpExpiresAt = Date.now() + 10 * 60 * 1000;

        await updateDoc(doc(db, "admins", adminDocId), {
          loginOtp: otp,
          loginOtpExpiresAt: otpExpiresAt,
          isVerified: false,
          lastVerifiedAt: null,
        });

        // 4. Send OTP email
        try {
          await sendEmail(adminEmail, EMAILJS_ADMIN_TEMPLATE_ID, {
            otp_code: otp,
          });
        } catch (emailError: any) {
          Alert.alert(
            "Email Error",
            emailError.message || "Failed to send OTP email.",
          );
          setLoading(false);
          return;
        }

        Alert.alert(
          "OTP Sent",
          `A 6-digit OTP has been sent to ${adminEmail}. It expires in 10 minutes.`,
          [{ text: "OK" }],
        );

        // 5. Navigate to OTP screen
        router.push({
          pathname: "/src/screens/LoginOTPScreen",
          params: { email: adminEmail, password, role: "Admin", adminDocId },
        });

        // ════════════════════════════════════════════════════════════════════════
        // CONSUMER FLOW
        // ════════════════════════════════════════════════════════════════════════
      } else {
        // FIX 3: Keep email as-is — just trim it, don't convert to lowercase
        let loginEmail = emailOrId.trim();
        let consumerDocId = "";
        let consumerData: Record<string, any> = {};

        // 1. Resolve Consumer ID → email if needed
        if (!emailOrId.includes("@")) {
          //login as consumer id
          const idSnap = await getDocs(
            query(
              collection(db, "consumers"),
              where("consumerId", "==", emailOrId.trim()),
            ),
          );
          if (idSnap.empty) {
            Alert.alert("Error", "No consumer found with this ID.");
            setLoading(false);
            return;
          }
          // FIX 4: Take email from Firestore as-is — don't convert to lowercase
          loginEmail = idSnap.docs[0].data().email?.trim();
          consumerDocId = idSnap.docs[0].id;
          consumerData = idSnap.docs[0].data();

          if (!loginEmail) {
            Alert.alert(
              "Error",
              "Consumer email not found. Please contact support.",
            );
            setLoading(false);
            return;
          }
        } else {
          //ogin with email — for case-insensitive Firestore query, first try exact match
          let emailSnap = await getDocs(
            query(
              collection(db, "consumers"),
              where("email", "==", loginEmail),
            ),
          );

          // FIX 5: If exact match not found, then try lowercase match (for legacy data that may be inconsistent)
          if (emailSnap.empty) {
            emailSnap = await getDocs(
              query(
                collection(db, "consumers"),
                where("email", "==", loginEmail.toLowerCase()),
              ),
            );
          }

          if (emailSnap.empty) {
            Alert.alert("Error", "Consumer record not found.");
            setLoading(false);
            return;
          }

          consumerDocId = emailSnap.docs[0].id;
          consumerData = emailSnap.docs[0].data();
          //FIX 6: Use the exact email that is registered in Firebase Auth
          loginEmail = consumerData.email?.trim();
        }

        // 2. Firebase Auth — sign in to validate password
        try {
          await signInWithEmailAndPassword(auth, loginEmail, password);
        } catch (authError: any) {
          console.log("Auth error code:", authError.code);
          console.log("Trying email:", loginEmail);
          if (
            authError.code === "auth/invalid-credential" ||
            authError.code === "auth/wrong-password" ||
            authError.code === "auth/user-not-found"
          ) {
            Alert.alert("Login Failed", "Invalid email or password.");
          } else {
            Alert.alert(
              "Login Failed",
              authError.message || "Authentication failed.",
            );
          }
          setLoading(false);
          return;
        }

        // ── Check 1-week window ───────────────────────────────────────────────
        if (isWithinVerifiedWindow(consumerData)) {
          console.log("Consumer already verified within 1 week, skipping OTP.");
          router.replace("/src/Consumer" as any);
          setLoading(false);
          return;
        }

        // 3. Not within window → sign out, then send OTP
        await auth.signOut();

        const otp = generateOTP();
        const otpExpiresAt = Date.now() + 10 * 60 * 1000;

        await updateDoc(doc(db, "consumers", consumerDocId), {
          loginOtp: otp,
          loginOtpExpiresAt: otpExpiresAt,
          isVerified: false,
          lastVerifiedAt: null,
        });

        // 4. Send OTP email
        try {
          await sendEmail(loginEmail, EMAILJS_CONSUMER_TEMPLATE_ID, {
            otp_code: otp,
          });
        } catch (emailError: any) {
          Alert.alert(
            "Email Error",
            emailError.message || "Failed to send OTP email.",
          );
          setLoading(false);
          return;
        }

        Alert.alert(
          "OTP Sent",
          `A 6-digit OTP has been sent to ${loginEmail}. It expires in 10 minutes.`,
          [{ text: "OK" }],
        );

        // 5. Navigate to OTP screen
        router.push({
          pathname: "/src/screens/LoginOTPScreen",
          params: {
            email: loginEmail,
            password,
            role: "Consumer",
            consumerDocId,
          },
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Image
        source={require("../../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brandName}>Electra Guard</Text>
      <Text style={styles.subtitle}>
        Utility Theft Detection & Analytics System
      </Text>

      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "Consumer" && styles.tabButtonActive,
          ]}
          onPress={() => {
            setActiveTab("Consumer");
            setEmailOrId("");
            setPassword("");
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Consumer" && styles.tabTextActive,
            ]}
          >
            Consumer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "Admin" && styles.tabButtonActive,
          ]}
          onPress={() => {
            setActiveTab("Admin");
            setEmailOrId("");
            setPassword("");
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Admin" && styles.tabTextActive,
            ]}
          >
            Admin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email / ID input */}
      <TextInput
        style={styles.input}
        placeholder={
          activeTab === "Admin"
            ? "Enter Admin Email"
            : "Enter your Consumer ID or Email"
        }
        placeholderTextColor="#9CA3AF"
        value={emailOrId}
        onChangeText={setEmailOrId}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password input */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* OTP notice */}
      <View style={styles.otpNotice}>
        <Ionicons
          name={
            activeTab === "Admin" ? "shield-checkmark-outline" : "mail-outline"
          }
          size={14}
          color="#0B3C5D"
        />
        <Text style={styles.otpNoticeText}>
          A 6-digit OTP will be sent to your email for verification (once per
          week).
        </Text>
      </View>

      {/* Forgot password */}
      <TouchableOpacity
        style={styles.forgotContainer}
        onPress={() => router.push("/src/screens/ForgotPasswordScreen")}
      >
        <Text style={styles.forgotText}>Forget Password?</Text>
      </TouchableOpacity>

      {/* Continue button */}
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.loginButtonText}>Continue</Text>
        )}
      </TouchableOpacity>

      {/* Register link — Consumer only */}
      {activeTab === "Consumer" && (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: { width: 70, height: 70, marginBottom: 12 },
  brandName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#1F2933",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    width: "100%",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  tabButtonActive: { backgroundColor: "#0B3C5D" },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#0B3C5D" },
  tabTextActive: { color: "#FFFFFF" },
  input: {
    width: "100%",
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#1F2933",
    marginBottom: 14,
  },
  passwordContainer: {
    width: "100%",
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#1F2933",
  },
  otpNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    marginTop: 8,
    gap: 6,
  },
  otpNoticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#0B3C5D",
    flex: 1,
  },
  forgotContainer: { alignSelf: "flex-end", marginBottom: 24, marginTop: 8 },
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
    marginBottom: 20,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  registerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
  },
  registerLink: { color: "#0B3C5D", fontFamily: "Inter_600SemiBold" },
});
