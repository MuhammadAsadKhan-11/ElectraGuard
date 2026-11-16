import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthField, AuthScreen, NAVY } from "../../../components/AuthChrome";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { requestResetCode } from "../../../hooks/authSession";

// The reset code is generated, emailed (EmailJS) and checked by the backend.
// After it is verified, Firebase sends its own password-reset link.
type PortalType = "consumer" | "admin";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedPortal, setDetectedPortal] = useState<PortalType | null>(null);

  const accent = NAVY;
  const noticeBg = "#E8F1FF";
  const noticeBdr = "#E5E5EA";

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email or ID.");
      return;
    }
    setLoading(true);
    try {
      const identifier = email.trim();
      const res = await requestResetCode(identifier);
      setDetectedPortal(res.portal);
      const goNext = () =>
        router.push({
          pathname: "/src/screens/ResetOTPVerifyScreen",
          params: {
            identifier,
            email: res.maskedEmail || "your email",
            portal: res.portal,
            resendIn: String(res.resendIn ?? 60),
          },
        });
      if (res.alreadySent) {
        goNext();
      } else {
        Alert.alert("Code Sent", `A 6-digit code has been sent to ${res.maskedEmail || "your email"}.`, [
          { text: "OK", onPress: goNext },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = detectedPortal === "admin";

  return (
    <AuthScreen>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        {isAdmin
          ? "Enter the admin email or Admin ID. We will send a 6-digit code."
          : "Enter your email, Consumer ID, or Admin ID. We will send a 6-digit code."}
      </Text>

      <AuthField
        icon="mail-outline"
        placeholder="Email or ID"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />

      <View style={[styles.noticeBox, { backgroundColor: noticeBg, borderColor: noticeBdr }]}>
        <Ionicons name="shield-checkmark" size={18} color={accent} />
        <View style={styles.noticeTextContainer}>
          <Text style={styles.noticeTitle}>Secure verification</Text>
          <Text style={styles.noticeText}>
            The code goes to the email saved on the account.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: accent }]}
        onPress={handleSendCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={18} color="#111111" />
            <Text style={styles.sendButtonText}>Send code</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/src/screens/LoginScreen")}>
        <Ionicons name="arrow-back" size={16} color="#374151" />
        <Text style={styles.backButtonText}>Back to sign in</Text>
      </TouchableOpacity>

      <Text style={styles.supportText}>
        Need help? Call the helpline{" "}
        <Text style={[styles.supportLink, { color: accent }]}>118</Text>
      </Text>
    </AuthScreen>
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
    color: "#111111",
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
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#111111",
    marginBottom: 16,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 18,
    gap: 10,
  },
  noticeTextContainer: { flex: 1 },
  noticeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: NAVY,
    marginBottom: 2,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: NAVY,
    lineHeight: 18,
  },
  sendButton: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  sendButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  backButton: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
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
    color: "#8E8E93",
    textAlign: "center",
  },
  supportLink: { fontFamily: "Inter_500Medium" },
});
