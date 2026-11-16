import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthScreen, NAVY } from "../../../components/AuthChrome";
import { sendPasswordResetEmail } from "firebase/auth";
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

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{
    email: string;
  }>();

  const [loading, setLoading] = useState(false);

  // FIX: Use Firebase's built-in password reset email — no stored passwords needed.
  // This is the correct, secure pattern. Firebase emails a reset link directly to the user.
  const handleConfirm = async () => {
    if (!email) {
      Alert.alert("Error", "Email not found. Please restart the process.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Email Sent! 📧",
        `A password reset link has been sent to ${email}. Please check your inbox and follow the link to set a new password.`,
        [
          {
            text: "Back to Login",
            onPress: () => router.replace("/src/screens/LoginScreen"),
          },
        ],
      );
    } catch (error: any) {
      switch (error.code) {
        case "auth/user-not-found":
          Alert.alert("Error", "No account found with this email.");
          break;
        case "auth/invalid-email":
          Alert.alert("Error", "Invalid email address.");
          break;
        case "auth/too-many-requests":
          Alert.alert("Too Many Attempts", "Please try again after some time.");
          break;
        case "auth/network-request-failed":
          Alert.alert(
            "Network Error",
            "Please check your internet connection.",
          );
          break;
        default:
          Alert.alert(
            "Error",
            error.message || "Failed to send reset email. Please try again.",
          );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>
        We will email a secure reset link to the address below.
      </Text>

      <View style={styles.emailBox}>
        <Ionicons name="mail-outline" size={18} color="#111111" />
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color="#111111" />
        <Text style={styles.infoText}>
          Open the link in the email to choose a new password. The link expires shortly for your security.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleConfirm} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={18} color="#111111" />
            <Text style={styles.buttonText}>Send reset link</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backRow}
        onPress={() => router.replace("/src/screens/LoginScreen")}
      >
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
  emailBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingHorizontal: 14,
    minHeight: 52,
    marginBottom: 14,
  },
  emailText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: NAVY,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 18,
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: NAVY,
    lineHeight: 18,
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
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
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
