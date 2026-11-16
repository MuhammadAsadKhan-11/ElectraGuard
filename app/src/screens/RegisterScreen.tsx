import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthField, AuthScreen, NAVY } from "../../../components/AuthChrome";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { requestLoginOtp, signOutEverywhere } from "../../../hooks/authSession";

// The verification email (OTP) is sent by the backend; no EmailJS keys in the app.

// ── Field rules ────────────────────────────────────────────────────────────────
const CONSUMER_ID_MAX = 12; // letters + digits only
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 15;

// Returns an error message, or null if the password is valid.
// Rule: 8-15 chars with lowercase + uppercase + number + special character.
const getPasswordError = (pw: string): string | null => {
  if (pw.length < PASSWORD_MIN)
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (pw.length > PASSWORD_MAX)
    return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw))
    return "Password must include a special character (e.g. @, #, !).";
  return null;
};

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: "",
    consumerId: "",
    cnicNumber: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [cnicError, setCnicError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCnicChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    if (digitsOnly.length > 13) {
      setCnicError("CNIC number must be exactly 13 digits.");
      updateField("cnicNumber", digitsOnly.slice(0, 13));
    } else {
      setCnicError("");
      updateField("cnicNumber", digitsOnly);
    }
  };

  // Consumer ID: only letters and digits (no @, ., spaces or other symbols), max 12
  const handleConsumerIdChange = (value: string) => {
    updateField(
      "consumerId",
      value.replace(/[^a-zA-Z0-9]/g, "").slice(0, CONSUMER_ID_MAX),
    );
  };

  const validateForm = () => {
    const {
      fullName,
      consumerId,
      cnicNumber,
      email,
      mobileNumber,
      password,
      confirmPassword,
    } = form;
    if (
      !fullName ||
      !consumerId ||
      !cnicNumber ||
      !email ||
      !mobileNumber ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Error", "Please fill in all fields.");
      return false;
    }
    if (!/^[a-zA-Z0-9]{1,12}$/.test(consumerId)) {
      Alert.alert(
        "Invalid Consumer ID",
        "Consumer ID can only contain letters and digits (maximum 12).",
      );
      return false;
    }
    if (cnicNumber.length !== 13) {
      Alert.alert("Error", "CNIC number must be exactly 13 digits.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return false;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      Alert.alert("Weak Password", passwordError);
      return false;
    }
    if (!agreed) {
      Alert.alert("Error", "Please agree to the Terms & Conditions.");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      // ── Step 1: Duplicate email check ─────────────────────────────────────────
      // Friendly message only; Firebase Auth rejects duplicate emails anyway, so
      // a permission error (locked-down rules) just skips this check.
      let emailSnap: Awaited<ReturnType<typeof getDocs>> | null = null;
      try {
        emailSnap = await getDocs(
          query(collection(db, "consumers"), where("email", "==", form.email)),
        );
      } catch {
        emailSnap = null;
      }
      if (emailSnap && !emailSnap.empty) {
        const existingDoc = emailSnap.docs[0].data() as Record<string, any>;
        const allMatch =
          existingDoc.fullName === form.fullName &&
          existingDoc.consumerId === form.consumerId &&
          existingDoc.cnicNumber === form.cnicNumber &&
          existingDoc.mobileNumber === form.mobileNumber;
        Alert.alert(
          allMatch ? "Account Already Exists" : "Email Already In Use",
          allMatch
            ? "All your credentials already exist. Please login instead."
            : "This email is already registered with a different account.",
          allMatch
            ? [
                {
                  text: "Go to Login",
                  onPress: () => router.replace("/src/screens/LoginScreen"),
                },
                { text: "Cancel", style: "cancel" },
              ]
            : [{ text: "OK", style: "cancel" }],
        );
        setLoading(false);
        return;
      }

      // ── Step 2: Create Firebase Auth user ─────────────────────────────────────
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );
      const user = userCredential.user;

      // ── Step 4: Save consumer to Firestore ────────────────────────────────────
      // FIX: Never store passwords or base64-encoded passwords in Firestore.
      // Firebase Auth handles password storage securely.
      await setDoc(doc(db, "consumers", user.uid), {
        uid: user.uid,
        fullName: form.fullName,
        consumerId: form.consumerId,
        cnicNumber: form.cnicNumber,
        email: form.email,
        mobileNumber: form.mobileNumber,
        role: "consumer",
        isVerified: false,
        lastVerifiedAt: null,
        createdAt: serverTimestamp(),
      });

      // ── Step 3: Email verification code (backend + EmailJS) ───────────────────
      let otpInfo;
      try {
        otpInfo = await requestLoginOtp("consumer");
      } catch (emailErr: any) {
        await signOutEverywhere();
        Alert.alert(
          "Account Created",
          `${emailErr?.message || "We could not send the verification code."} Your account was created; sign in to receive a new code.`,
          [{ text: "Go to Login", onPress: () => router.replace("/src/screens/LoginScreen") }],
        );
        setLoading(false);
        return;
      }

      // ── Step 4: Navigate to OTP screen ───────────────────────────────────────
      router.push({
        pathname: "/src/screens/LoginOTPScreen",
        params: {
          email: otpInfo.maskedEmail || form.email,
          role: "consumer",
          expiresIn: String(otpInfo.expiresIn ?? 600),
          resendIn: String(otpInfo.resendIn ?? 60),
        },
      });
    } catch (error: any) {
      switch (error.code) {
        case "auth/email-already-in-use":
          Alert.alert(
            "Email Already In Use",
            "This email is already linked to an account.",
            [
              {
                text: "Go to Login",
                onPress: () => router.replace("/src/screens/LoginScreen"),
              },
              { text: "Cancel", style: "cancel" },
            ],
          );
          break;
        case "auth/invalid-email":
          Alert.alert("Invalid Email", "Please enter a valid email address.");
          break;
        case "auth/weak-password":
          Alert.alert(
            "Weak Password",
            "Password must be at least 6 characters.",
          );
          break;
        case "auth/network-request-failed":
          Alert.alert(
            "Network Error",
            "Please check your internet connection.",
          );
          break;
        default:
          Alert.alert(
            "Registration Failed",
            error.message || "Something went wrong.",
          );
      }
    } finally {
      setLoading(false);
    }
  };

  const fields: {
    key: keyof typeof form;
    placeholder: string;
    keyboard: "default" | "numeric" | "email-address" | "phone-pad";
    icon: "person-outline" | "id-card-outline" | "card-outline" | "mail-outline" | "call-outline";
  }[] = [
    { key: "fullName", placeholder: "Full name", keyboard: "default", icon: "person-outline" },
    { key: "consumerId", placeholder: "Consumer ID", keyboard: "default", icon: "id-card-outline" },
    { key: "cnicNumber", placeholder: "13-digit CNIC", keyboard: "numeric", icon: "card-outline" },
    { key: "email", placeholder: "Email address", keyboard: "email-address", icon: "mail-outline" },
    { key: "mobileNumber", placeholder: "Mobile number", keyboard: "phone-pad", icon: "call-outline" },
  ];

  return (
    <AuthScreen>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Register as a residential consumer</Text>

      {fields.map(({ key, placeholder, keyboard, icon }) => (
        <View key={key} style={{ width: "100%" }}>
          <AuthField
            icon={icon}
            placeholder={placeholder}
            value={form[key]}
            onChangeText={(v) =>
              key === "cnicNumber"
                ? handleCnicChange(v)
                : key === "consumerId"
                  ? handleConsumerIdChange(v)
                  : updateField(key, v)
            }
            keyboardType={keyboard}
            autoCapitalize={key === "fullName" ? "words" : "none"}
            autoCorrect={false}
            maxLength={key === "cnicNumber" ? 13 : key === "consumerId" ? CONSUMER_ID_MAX : undefined}
          />
          {key === "cnicNumber" && cnicError ? (
            <Text style={styles.fieldError}>{cnicError}</Text>
          ) : null}
        </View>
      ))}

      <AuthField
        icon="lock-closed-outline"
        placeholder="Password"
        value={form.password}
        onChangeText={(v) => updateField("password", v)}
        secureTextEntry={!showPassword}
        maxLength={PASSWORD_MAX}
        autoCapitalize="none"
        autoCorrect={false}
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
      <AuthField
        icon="lock-closed-outline"
        placeholder="Confirm password"
        value={form.confirmPassword}
        onChangeText={(v) => updateField("confirmPassword", v)}
        secureTextEntry={!showConfirmPassword}
        maxLength={PASSWORD_MAX}
        autoCapitalize="none"
        autoCorrect={false}
        trailing={
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            hitSlop={8}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#8E8E93"
            />
          </TouchableOpacity>
        }
      />

      <Text style={styles.passwordHint}>
        8–15 characters with uppercase, lowercase, a number, and a symbol.
      </Text>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Ionicons name="checkmark" size={14} color="#111111" />}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and{" "}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark" size={16} color="#111111" />
        <Text style={styles.securityText}>Your account is protected with email verification.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <>
            <Ionicons name="person-add-outline" size={18} color="#111111" />
            <Text style={styles.buttonText}>Create account</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.loginText}>
        Already have an account?{" "}
        <Text style={styles.loginLink} onPress={() => router.push("/src/screens/LoginScreen")}>
          Sign in
        </Text>
      </Text>
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
    marginTop: 4,
    marginBottom: 18,
  },
  fieldError: {
    color: "#FF3B30",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
    marginLeft: 4,
  },
  passwordHint: {
    width: "100%",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8E8E93",
    marginTop: -2,
    marginBottom: 14,
    lineHeight: 17,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: NAVY, borderColor: NAVY },
  checkboxLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 20,
  },
  linkText: { color: "#111111", fontFamily: "Inter_600SemiBold" },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    width: "100%",
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    padding: 12,
  },
  securityText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#111111",
    lineHeight: 17,
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
    marginBottom: 18,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  loginText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
  },
  loginLink: { color: "#111111", fontFamily: "Inter_600SemiBold" },
});