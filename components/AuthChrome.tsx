import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "../theme";

export const NAVY = "#0B3C5D";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.mark}>
              <Ionicons name="flash" size={26} color="#0B3C5D" />
            </View>
            <Text style={styles.brand}>ElectraGuard</Text>
            <Text style={styles.tag}>Electricity theft detection</Text>
          </View>
          <View style={styles.sheet}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  icon,
  trailing,
  ...props
}: TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={NAVY} />
      <TextInput
        placeholderTextColor="#8E8E93"
        style={styles.input}
        {...props}
      />
      {trailing}
    </View>
  );
}

export function OtpInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={styles.otpWrap}
    >
      <View style={styles.otpRow}>
        {Array.from({ length: 6 }).map((_, index) => {
          const filled = Boolean(value[index]);
          const active = value.length === index;
          return (
            <View
              key={index}
              style={[styles.otpBox, (filled || active) && styles.otpBoxOn]}
            >
              <Text style={styles.otpDigit}>{value[index] ?? ""}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        caretHidden
        autoFocus
        style={styles.otpCapture}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B3C5D" },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 28,
  },
  mark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brand: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
  },
  tag: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#D6E4EE",
    marginTop: 2,
  },
  sheet: {
    flex: 1,
    backgroundColor: palette.grey,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 36,
  },
  field: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.soft,
    paddingHorizontal: 14,
    minHeight: 52,
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: palette.black,
    paddingVertical: 12,
  },
  otpWrap: {
    width: "100%",
    marginBottom: 16,
    position: "relative",
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: palette.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxOn: {
    borderColor: NAVY,
  },
  otpDigit: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: palette.black,
  },
  otpCapture: {
    ...StyleSheet.absoluteFill,
    color: "transparent",
  },
});
