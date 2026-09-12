import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";

// ── EmailJS Config ─────────────────────────────────────────────────────────────
const EMAILJS = {
  CONSUMER: {
    SERVICE_ID: "service_ppos2gl",
    TEMPLATE_ID: "template_wnuezjd",
    PUBLIC_KEY: "83JP4TIBzm32sCEDB",
    PRIVATE_KEY: "FVcfX-d6wCX9gpEg_a25B",
  },
  ADMIN: {
    SERVICE_ID: "service_wynnt38",
    TEMPLATE_ID: "template_p7vjo2g",
    PUBLIC_KEY: "hMZkNajE1DpuQeOMQ",
    PRIVATE_KEY: "n5Zknt7IKTmMQdj_C9dDA",
  },
};

type PortalType = "consumer" | "admin";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPviaEmailJS(
  toEmail: string,
  otp: string,
  portal: PortalType,
): Promise<void> {
  const config = portal === "admin" ? EMAILJS.ADMIN : EMAILJS.CONSUMER;
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: config.SERVICE_ID,
      template_id: config.TEMPLATE_ID,
      user_id: config.PUBLIC_KEY,
      accessToken: config.PRIVATE_KEY,
      template_params: { to_email: toEmail, otp_code: otp },
    }),
  });
  const responseText = await res.text();
  if (!res.ok)
    throw new Error(`EmailJS Error: ${res.status} - ${responseText}`);
}

// FIX: Detects portal AND returns the Firestore document ID so we can store OTP there
async function detectPortalAndEmail(input: string): Promise<{
  portal: PortalType;
  foundEmail: string;
  docId: string;
  collectionName: string;
}> {
  const isEmail = input.includes("@");

  // Check admins first
  const adminQ = isEmail
    ? query(collection(db, "admins"), where("email", "==", input))
    : query(collection(db, "admins"), where("adminId", "==", input));
  const adminSnap = await getDocs(adminQ);
  if (!adminSnap.empty) {
    return {
      portal: "admin",
      foundEmail: isEmail ? input : adminSnap.docs[0].data().email,
      docId: adminSnap.docs[0].id,
      collectionName: "admins",
    };
  }

  // Then check consumers
  const consumerQ = isEmail
    ? query(collection(db, "consumers"), where("email", "==", input))
    : query(collection(db, "consumers"), where("consumerId", "==", input));
  const consumerSnap = await getDocs(consumerQ);
  if (!consumerSnap.empty) {
    return {
      portal: "consumer",
      foundEmail: isEmail ? input : consumerSnap.docs[0].data().email,
      docId: consumerSnap.docs[0].id,
      collectionName: "consumers",
    };
  }

  throw new Error("No account found with this email or ID.");
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedPortal, setDetectedPortal] = useState<PortalType | null>(null);

  const isAdmin = detectedPortal === "admin";
  const accent = isAdmin ? "#1A73E8" : "#2EC4B6";
  const noticeBg = isAdmin ? "#F0F4FF" : "#F0FFFE";
  const noticeBdr = isAdmin ? "#C7D7F9" : "#CCF5F2";

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email or ID.");
      return;
    }
    setLoading(true);
    try {
      const { portal, foundEmail, docId, collectionName } =
        await detectPortalAndEmail(email.trim());
      setDetectedPortal(portal);

      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      // FIX: Store OTP in Firestore — never pass it through navigation params
      await updateDoc(doc(db, collectionName, docId), {
        resetOtp: otp,
        resetOtpExpiresAt: expiresAt,
      });

      await sendOTPviaEmailJS(foundEmail, otp, portal);

      Alert.alert("Code Sent", "A 6-digit code has been sent to your email.", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: "/src/screens/ResetOTPVerifyScreen",
              params: {
                email: foundEmail,
                docId,
                collectionName,
                portal,
                // FIX: No OTP or expiresAt in params — fetched from Firestore on verify
              },
            }),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Text style={styles.headerTitle}>
        {isAdmin ? "Admin Password Reset" : "Password Reset"}
      </Text>

      <View style={[styles.iconContainer, { backgroundColor: accent }]}>
        <Ionicons name="mail-outline" size={32} color="#FFFFFF" />
      </View>

      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        {isAdmin
          ? "Enter your registered email or Admin ID. We'll send you an OTP to verify your identity."
          : "Enter your registered email or Consumer ID. We'll send you an OTP to verify your identity."}
      </Text>

      <Text style={styles.label}>Enter your Email or ID</Text>
      <TextInput
        style={styles.input}
        placeholder={
          isAdmin
            ? "Enter your Email or Admin ID"
            : "Enter your Email or Consumer ID"
        }
        placeholderTextColor="#B0BEC5"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View
        style={[
          styles.noticeBox,
          { backgroundColor: noticeBg, borderColor: noticeBdr },
        ]}
      >
        <Ionicons name="checkmark-circle" size={18} color={accent} />
        <View style={styles.noticeTextContainer}>
          <Text style={styles.noticeTitle}>Secure Verification</Text>
          <Text style={styles.noticeText}>
            A 6-digit code will be sent to your registered email for
            verification.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: accent }]}
        onPress={handleSendCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.sendButtonText}>Send Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/src/screens/LoginScreen")}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.supportText}>
        Need help? Contact support at{" "}
        <Text style={[styles.supportLink, { color: accent }]}>
          1800-xxx-xxxx
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
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
    paddingHorizontal: 8,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#374151",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#1F2933",
    marginBottom: 16,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    width: "100%",
    marginBottom: 28,
    gap: 10,
  },
  noticeTextContainer: { flex: 1 },
  noticeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#1F2933",
    marginBottom: 2,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  sendButton: {
    width: "100%",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  sendButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  backButton: {
    width: "100%",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "#374151",
  },
  supportText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  supportLink: { fontFamily: "Inter_500Medium" },
});
