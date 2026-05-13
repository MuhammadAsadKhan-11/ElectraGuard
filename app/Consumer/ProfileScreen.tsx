// ProfileScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Language, Theme } from "../../constants/translations";
import { auth, db } from "../../firebaseConfig";
import { useAppSettings } from "../../hooks/AppSettingContext";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface UserProfile {
  fullName:        string;
  email:           string;
  mobileNumber:    string;
  consumerId:      string;
  cnicNumber:      string;
  role:            string;
  createdAt:       any;
  passwordEncoded?: string;
}

interface MenuRowProps {
  icon:          IoniconsName;
  label:         string;
  subtitle?:     string;
  onPress?:      () => void;
  showChevron?:  boolean;
  labelColor?:   string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const formatDate = (ts: any): string => {
  if (!ts) return "—";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// ─────────────────────────────────────────────────────────────
// AVATAR INITIALS
// ─────────────────────────────────────────────────────────────
const AvatarInitials: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarText}>{initials || "?"}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MENU ROW
// ─────────────────────────────────────────────────────────────
const MenuRow: React.FC<MenuRowProps> = ({
  icon, label, subtitle, onPress, showChevron = true, labelColor = "#1A202C",
}) => (
  <TouchableOpacity
    style={styles.menuRow}
    onPress={onPress}
    activeOpacity={0.6}
    disabled={!onPress}
  >
    <View style={styles.menuIconBox}>
      <Ionicons name={icon} size={18} color="#718096" />
    </View>
    <View style={styles.menuTextBox}>
      <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
      {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {showChevron && <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />}
  </TouchableOpacity>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// ─────────────────────────────────────────────────────────────
// SYSTEM SETTINGS MODAL  ← updated
// ─────────────────────────────────────────────────────────────
const SystemSettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { t, language, theme, setLanguage, setTheme, colors } = useAppSettings();

  const languages: { key: Language; label: string }[] = [
    { key: 'en',       label: 'English'       },
    { key: 'ur_roman', label: 'اردو (Roman)'  },
    { key: 'ur',       label: 'اردو'          },
    { key: 'ar',       label: 'العربية'       },
  ];

  const themes: { key: Theme; label: string; icon: IoniconsName }[] = [
    { key: 'light',  label: t.themeLight,  icon: 'sunny-outline'    },
    { key: 'dark',   label: t.themeDark,   icon: 'moon-outline'     },
    { key: 'system', label: t.themeSystem, icon: 'phone-portrait-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { paddingBottom: 28 }]}>
          <Text style={styles.modalTitle}>{t.settingsTitle}</Text>

          {/* ── Language ── */}
          <Text style={styles.settingsSection}>{t.appLanguage}</Text>
          <View style={styles.optionsGrid}>
            {languages.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionPill,
                  language === key && styles.optionPillActive,
                ]}
                onPress={() => setLanguage(key)}
                activeOpacity={0.7}
              >
                {language === key && (
                  <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text style={[
                  styles.optionPillText,
                  language === key && styles.optionPillTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Theme ── */}
          <Text style={styles.settingsSection}>{t.appTheme}</Text>
          <View style={styles.themeRow}>
            {themes.map(({ key, label, icon }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.themeCard,
                  theme === key && styles.themeCardActive,
                ]}
                onPress={() => setTheme(key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={icon}
                  size={22}
                  color={theme === key ? '#fff' : '#718096'}
                />
                <Text style={[
                  styles.themeCardText,
                  theme === key && styles.themeCardTextActive,
                ]}>
                  {label}
                </Text>
                {theme === key && (
                  <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Data Sync & Cache (read-only) ── */}
          <View style={styles.settingsInfoRow}>
            <Ionicons name="sync-outline" size={16} color="#718096" />
            <Text style={styles.settingsInfoText}>{t.dataSync}: {t.dataSyncSub}</Text>
          </View>
          <View style={styles.settingsInfoRow}>
            <Ionicons name="trash-outline" size={16} color="#718096" />
            <Text style={styles.settingsInfoText}>{t.cacheInfo}: {t.cacheInfoSub}</Text>
          </View>

          <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 20 }]} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>{t.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// PROFILE INFO MODAL
// ─────────────────────────────────────────────────────────────
const ProfileInfoModal: React.FC<{
  visible:  boolean;
  profile:  UserProfile | null;
  onClose:  () => void;
}> = ({ visible, profile, onClose }) => {
  const { t } = useAppSettings();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { paddingBottom: 28 }]}>
          <Text style={styles.modalTitle}>{t.profileInfo}</Text>
          {[
            { label: t.fullName,      value: profile?.fullName,     icon: "person-outline"   as IoniconsName },
            { label: t.consumerId,    value: profile?.consumerId,   icon: "card-outline"     as IoniconsName },
            { label: t.cnicNumber,    value: profile?.cnicNumber,   icon: "id-card-outline"  as IoniconsName },
            { label: t.email,         value: profile?.email,        icon: "mail-outline"     as IoniconsName },
            { label: t.mobileNumber,  value: profile?.mobileNumber, icon: "call-outline"     as IoniconsName },
            { label: t.role,          value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : t.consumer, icon: "shield-outline" as IoniconsName },
            { label: t.registeredOn,  value: formatDate(profile?.createdAt), icon: "calendar-outline" as IoniconsName },
          ].map(({ label, value, icon }) => (
            <View key={label} style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name={icon} size={16} color="#2B4C7E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || "—"}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>{t.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD MODAL
// ─────────────────────────────────────────────────────────────
const ChangePasswordModal: React.FC<{
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
}> = ({ visible, profile, onClose }) => {
  const { t } = useAppSettings();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld]         = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);

  const reset = () => {
    setOldPassword(""); setNewPassword(""); setConfirmPass("");
    setShowOld(false); setShowNew(false); setShowConfirm(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleForgotPassword = () => {
    handleClose();
    router.push({ pathname: "/screens/ForgotPasswordScreen" as any, params: { portal: "consumer" } });
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPass) { Alert.alert(t.error, "Please fill in all fields."); return; }
    if (newPassword.length < 6)   { Alert.alert(t.error, t.passShort);    return; }
    if (newPassword !== confirmPass) { Alert.alert(t.error, t.passMismatch); return; }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No user found.");

      if (profile?.passwordEncoded) {
        const storedOld = Buffer.from(profile.passwordEncoded, "base64").toString("utf8");
        if (oldPassword !== storedOld) {
          Alert.alert(t.error, t.incorrectPass, [
            { text: t.forgotPassword, onPress: handleForgotPassword },
            { text: t.cancel, style: "cancel" },
          ]);
          setLoading(false); return;
        }
      }

      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      const newHash    = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPassword);
      const newEncoded = Buffer.from(newPassword).toString("base64");
      await updateDoc(doc(db, "consumers", user.uid), { passwordHash: newHash, passwordEncoded: newEncoded });

      Alert.alert(t.success + " ✅", t.passUpdated);
      handleClose();
    } catch (error: any) {
      switch (error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          Alert.alert(t.error, t.incorrectPass, [
            { text: t.forgotPassword, onPress: handleForgotPassword },
            { text: t.cancel, style: "cancel" },
          ]);
          break;
        case "auth/too-many-requests":
          Alert.alert(t.error, "Too many attempts. Please try again later.");
          break;
        default:
          Alert.alert(t.error, error.message || "Failed to update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = (
    value: string, setter: (v: string) => void,
    placeholder: string, show: boolean, toggleShow: () => void
  ) => (
    <View style={styles.passInputWrapper}>
      <TextInput
        style={styles.passInput}
        placeholder={placeholder}
        placeholderTextColor="#B0BEC5"
        value={value}
        onChangeText={setter}
        secureTextEntry={!show}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={toggleShow} style={{ paddingHorizontal: 12 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{t.changePassTitle}</Text>
          <Text style={styles.modalMessage}>{t.changePassSub}</Text>
          {PasswordField(oldPassword, setOldPassword, t.oldPassword, showOld, () => setShowOld(v => !v))}
          {PasswordField(newPassword, setNewPassword, t.newPassword, showNew, () => setShowNew(v => !v))}
          {PasswordField(confirmPass, setConfirmPass, t.confirmPassword, showConfirm, () => setShowConfirm(v => !v))}
          <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: "flex-end", marginBottom: 16 }}>
            <Text style={{ color: "#2B4C7E", fontSize: 12, fontWeight: "600" }}>{t.forgotPassword}</Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
              <Text style={styles.modalCancelText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalLogoutText}>{t.confirm}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// PRIVACY POLICY MODAL
// ─────────────────────────────────────────────────────────────
const PrivacyPolicyModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { t } = useAppSettings();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { maxHeight: "85%", paddingBottom: 24 }]}>
          <Text style={styles.modalTitle}>{t.privacyTitle}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
            {[
              { heading: "1. Data Collection",   body: "ElectraGuard collects your name, CNIC, email, mobile number, Consumer ID, and electricity consumption data (CSV uploads) to provide electricity monitoring services." },
              { heading: "2. Data Usage",        body: "Your data is used solely to detect electricity theft, calculate consumption, and generate risk scores. We do not sell or share your data with third parties." },
              { heading: "3. Data Storage",      body: "All data is securely stored in Firebase (Google Cloud). Passwords are encrypted using SHA-256 hashing before storage." },
              { heading: "4. Authentication",    body: "We use Firebase Authentication for secure login. OTP verification is used for password recovery and two-factor authentication." },
              { heading: "5. Your Rights",       body: "You may request deletion of your account and associated data by contacting our support team." },
              { heading: "6. Security",          body: "We implement industry-standard security practices including encrypted data transmission, hashed passwords, and regular security audits." },
              { heading: "7. Contact",           body: "For privacy-related queries, contact us at support@electraguard.pk or through the Support section in the app." },
            ].map(({ heading, body }) => (
              <View key={heading} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#1A202C", marginBottom: 4 }}>{heading}</Text>
                <Text style={{ fontSize: 12, color: "#4A5568", lineHeight: 18 }}>{body}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: "#A0AEC0", marginTop: 8, textAlign: "center" }}>{t.lastUpdated}</Text>
          </ScrollView>
          <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 16 }]} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>{t.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function ProfileScreen(): React.ReactElement {
  const { t, colors, language } = useAppSettings();

  const [profile, setProfile]                       = useState<UserProfile | null>(null);
  const [loading, setLoading]                       = useState<boolean>(true);
  const [loggingOut, setLoggingOut]                 = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal]       = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal]     = useState<boolean>(false);
  const [showPassModal, setShowPassModal]           = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal]     = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal]   = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { router.replace("/screens/LoginScreen"); return; }
        const snap = await getDoc(doc(db, "consumers", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            fullName:        d.fullName    || user.displayName || t.consumer,
            email:           d.email       || user.email       || "",
            mobileNumber:    d.mobileNumber || d.phone         || "",
            consumerId:      d.consumerId  || "—",
            cnicNumber:      d.cnicNumber  || "—",
            role:            d.role        || "consumer",
            createdAt:       d.createdAt,
            passwordEncoded: d.passwordEncoded || "",
          });
        } else {
          setProfile({ fullName: user.displayName || t.consumer, email: user.email || "", mobileNumber: "", consumerId: "—", cnicNumber: "—", role: "consumer", createdAt: null });
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/screens/LoginScreen");
    } catch {
      Alert.alert(t.error, "Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  const firstName = profile?.fullName?.split(" ")[0] ?? t.consumer;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ── */}
        <View style={styles.profileHeader}>
          <AvatarInitials name={profile?.fullName || "?"} />
          <Text style={[styles.profileName, { color: colors.text }]}>{profile?.fullName || t.consumer}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#2B4C7E" />
            <Text style={styles.roleBadgeText}>
              {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : t.consumer}
            </Text>
          </View>
        </View>

        {/* ── Account ── */}
        <SectionHeader title={t.account} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="person-outline" label={t.profileInfo} subtitle={`${firstName} • ID: ${profile?.consumerId}`} onPress={() => setShowProfileModal(true)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow icon="mail-outline"   label={t.email}  subtitle={profile?.email || "—"} showChevron={false} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow icon="call-outline"   label={t.phone}  subtitle={profile?.mobileNumber || "—"} showChevron={false} />
        </View>

        {/* ── Preferences ── */}
        <SectionHeader title={t.preferences} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow
            icon="notifications-outline"
            label={t.notifications}
            subtitle={t.notificationsSub}
            onPress={() => Alert.alert(t.notifTitle, t.notifBody, [{ text: t.ok }])}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="settings-outline"
            label={t.systemSettings}
            onPress={() => setShowSettingsModal(true)}  // ← opens new modal
          />
        </View>

        {/* ── Security ── */}
        <SectionHeader title={t.security} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="lock-closed-outline" label={t.changePassword} onPress={() => setShowPassModal(true)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow icon="shield-outline" label={t.twoFactor} subtitle={t.twoFactorSub} showChevron={false} />
        </View>

        {/* ── About ── */}
        <SectionHeader title={t.about} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="information-circle-outline" label={t.appVersion} subtitle="v1.0.0 (Build 100) — ElectraGuard" showChevron={false} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow icon="document-text-outline" label={t.privacyPolicy} onPress={() => setShowPrivacyModal(true)} />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
          disabled={loggingOut}
        >
          {loggingOut
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="log-out-outline" size={18} color="#fff" /><Text style={styles.logoutText}>{t.logout}</Text></>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.subText }]}>© 2026 ElectraGuard System</Text>
          <Text style={[styles.footerText, { color: colors.subText }]}>Government Enterprise Solution</Text>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <SystemSettingsModal  visible={showSettingsModal}  onClose={() => setShowSettingsModal(false)} />
      <ProfileInfoModal     visible={showProfileModal}   profile={profile} onClose={() => setShowProfileModal(false)} />
      <ChangePasswordModal  visible={showPassModal}      profile={profile} onClose={() => setShowPassModal(false)} />
      <PrivacyPolicyModal   visible={showPrivacyModal}   onClose={() => setShowPrivacyModal(false)} />

      {/* ── Logout Confirmation ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconBox}>
              <Ionicons name="log-out-outline" size={28} color="#E53E3E" />
            </View>
            <Text style={styles.modalTitle}>{t.logoutConfirm}</Text>
            <Text style={styles.modalMessage}>{t.logoutMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
                <Text style={styles.modalLogoutText}>{t.logout}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  centered:      { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText:   { color: "#718096", fontSize: 14 },

  profileHeader: { alignItems: "center", paddingVertical: 24 },
  avatarCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: "#2B4C7E", justifyContent: "center", alignItems: "center", marginTop: 20, marginBottom: 12, shadowColor: "#2B4C7E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  avatarText:    { color: "#fff", fontSize: 26, fontWeight: "800" },
  profileName:   { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  roleBadge:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EBF4FF", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontSize: 12, fontWeight: "700", color: "#2B4C7E" },

  sectionTitle:  { fontSize: 12, fontWeight: "700", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 8, marginLeft: 4 },

  card:          { borderRadius: 14, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: "hidden" },
  menuRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  menuIconBox:   { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F7F8FC", justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuTextBox:   { flex: 1 },
  menuLabel:     { fontSize: 14, fontWeight: "600" },
  menuSubtitle:  { fontSize: 12, color: "#718096", marginTop: 1 },
  divider:       { height: 1, marginLeft: 60 },

  logoutBtn:     { backgroundColor: "#E53E3E", borderRadius: 12, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, marginBottom: 20, shadowColor: "#E53E3E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  logoutText:    { color: "#fff", fontWeight: "700", fontSize: 15 },

  footer:        { alignItems: "center", gap: 2, marginBottom: 8 },
  footerText:    { fontSize: 11 },

  // Modal
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modalBox:         { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalIconBox:     { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF5F5", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  modalTitle:       { fontSize: 18, fontWeight: "800", color: "#1A202C", marginBottom: 8 },
  modalMessage:     { fontSize: 13, color: "#718096", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  modalButtons:     { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn:   { flex: 1, backgroundColor: "#F7F8FC", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalCancelText:  { color: "#4A5568", fontWeight: "700", fontSize: 14 },
  modalLogoutBtn:   { flex: 1, backgroundColor: "#2B4C7E", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalLogoutText:  { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalCloseBtn:    { backgroundColor: "#2B4C7E", borderRadius: 10, paddingVertical: 13, paddingHorizontal: 40, alignItems: "center", marginTop: 8 },
  modalCloseBtnText:{ color: "#fff", fontWeight: "700", fontSize: 14 },

  // Profile info
  infoRow:      { flexDirection: "row", alignItems: "flex-start", width: "100%", marginBottom: 12, gap: 10 },
  infoIconBox:  { width: 32, height: 32, borderRadius: 8, backgroundColor: "#EBF4FF", justifyContent: "center", alignItems: "center" },
  infoLabel:    { fontSize: 11, color: "#A0AEC0", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:    { fontSize: 14, color: "#1A202C", fontWeight: "600", marginTop: 1 },

  // Password fields
  passInputWrapper: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, marginBottom: 10 },
  passInput:        { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1F2933" },

  // Settings modal
  settingsSection:  { fontSize: 12, fontWeight: "700", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: 0.8, alignSelf: "flex-start", marginTop: 14, marginBottom: 8 },
  optionsGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  optionPill:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  optionPillActive: { backgroundColor: "#0B3C5D", borderColor: "#0B3C5D" },
  optionPillText:   { fontSize: 13, color: "#374151", fontWeight: "600" },
  optionPillTextActive: { color: "#fff" },
  themeRow:         { flexDirection: "row", gap: 8, width: "100%" },
  themeCard:        { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", gap: 4 },
  themeCardActive:  { backgroundColor: "#0B3C5D", borderColor: "#0B3C5D" },
  themeCardText:    { fontSize: 11, fontWeight: "700", color: "#718096" },
  themeCardTextActive: { color: "#fff" },
  settingsInfoRow:  { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 10 },
  settingsInfoText: { fontSize: 12, color: "#718096" },
});