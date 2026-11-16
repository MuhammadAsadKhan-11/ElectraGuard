// components/TwoFactorSetting.tsx
// Profile → Security → Two-Factor Authentication (Consumer and Admin).
// When ON, every sign-in on a new device needs a 6-digit code emailed through
// EmailJS by the backend. Turning it on or off also needs an emailed code.
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppSettings } from "../hooks/AppSettingContext";
import {
  confirmTwoFactorChange,
  getTwoFactorStatus,
  requestTwoFactorChange,
} from "../hooks/authSession";

const NAVY = "#0B3C5D";

export default function TwoFactorSetting({ label }: { label: string }) {
  const { colors } = useAppSettings();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [available, setAvailable] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // code modal
  const [target, setTarget] = useState<boolean | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const s = await getTwoFactorStatus();
      setEnabled(s.enabled);
      setAvailable(s.available);
    } catch (e: any) {
      setLoadError(e?.message || "Could not load the setting.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const startChange = async (enable: boolean, resend = false) => {
    setBusy(true);
    setError("");
    try {
      const res = await requestTwoFactorChange(enable, resend);
      setMaskedEmail(res.maskedEmail || "your email");
      setCooldown(res.resendIn ?? 60);
      setTarget(enable);
    } catch (e: any) {
      const msg = e?.message || "Could not send the code.";
      if (target !== null) setError(msg);
      else Alert.alert("Two-Factor Authentication", msg);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (target === null) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await confirmTwoFactorChange(target, code.trim());
      setEnabled(res.enabled);
      setTarget(null);
      setCode("");
      Alert.alert(
        "Two-Factor Authentication",
        res.enabled
          ? "Turned on. A code will be emailed when you sign in on a new device."
          : "Turned off. You will sign in with your password only.",
      );
    } catch (e: any) {
      setError(e?.message || "Verification failed.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const closeModal = () => {
    setTarget(null);
    setCode("");
    setError("");
  };

  const subtitle =
    loadError ?? (enabled === null ? "Checking…" : !available ? "Not available on this server" : enabled ? "On – email code at sign-in" : "Off");

  return (
    <>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
          <Ionicons name={enabled ? "shield-checkmark-outline" : "shield-outline"} size={18} color={colors.subText} />
        </View>
        <TouchableOpacity style={styles.textBox} onPress={loadError ? load : undefined} disabled={!loadError}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.subtitle, { color: loadError ? "#B91C1C" : colors.subText }]}>
            {subtitle}
            {loadError ? " (tap to retry)" : ""}
          </Text>
        </TouchableOpacity>
        {busy || enabled === null ? (
          !loadError && <ActivityIndicator size="small" color={NAVY} />
        ) : (
          <Switch
            value={!!enabled}
            onValueChange={(v) => startChange(v)}
            disabled={!available || busy}
            trackColor={{ true: NAVY, false: "#D1D5DB" }}
            thumbColor="#FFFFFF"
          />
        )}
      </View>

      <Modal visible={target !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {target ? "Turn on" : "Turn off"} two-factor authentication
            </Text>
            <Text style={[styles.sheetText, { color: colors.subText }]}>
              Enter the 6-digit code sent to {maskedEmail}.
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, "").slice(0, 6));
                if (error) setError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={colors.subText}
              autoFocus
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primary, (verifying || code.length < 6) && { opacity: 0.5 }]}
              onPress={confirm}
              disabled={verifying || code.length < 6}
            >
              {verifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Confirm</Text>}
            </TouchableOpacity>
            <View style={styles.footer}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={[styles.link, { color: colors.subText }]}>Cancel</Text>
              </TouchableOpacity>
              {cooldown > 0 ? (
                <Text style={[styles.link, { color: colors.subText }]}>Resend in {cooldown}s</Text>
              ) : (
                <TouchableOpacity onPress={() => target !== null && startChange(target, true)} disabled={busy}>
                  <Text style={[styles.link, { color: NAVY }]}>{busy ? "Sending…" : "Resend code"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  textBox: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 12, marginTop: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  sheet: { borderRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetText: { fontSize: 13, marginTop: 6, marginBottom: 14, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "700",
  },
  error: { color: "#B91C1C", fontSize: 13, marginTop: 10, textAlign: "center" },
  primary: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  link: { fontSize: 13, fontWeight: "600" },
});
