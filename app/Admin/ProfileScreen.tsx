// ProfileScreen.tsx  (Admin Portal)
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
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
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
import { auth, db } from "../../firebaseConfig";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface AdminProfile {
  fullName: string;
  email: string;
  mobileNumber: string;
  adminId: string;
  cnicNumber: string;
  role: string;
  permissions: string[];
  createdAt: any;
  passwordEncoded?: string;
}

interface AdminStats {
  casesHandled: number;
  resolved: number;
  successRate: number;
}

interface MenuRowProps {
  icon: IoniconsName;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  labelColor?: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const formatDate = (ts: any): string => {
  if (!ts) return "—";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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
// STATS CARD
// ─────────────────────────────────────────────────────────────
const StatsRow: React.FC<{ stats: AdminStats }> = ({ stats }) => (
  <View style={styles.statsRow}>
    {[
      { label: "Cases Handled", value: stats.casesHandled },
      { label: "Resolved",      value: stats.resolved },
      { label: "Success Rate",  value: `${stats.successRate}%` },
    ].map(({ label, value }) => (
      <View key={label} style={styles.statCard}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    ))}
  </View>
);

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
// PROFILE INFO MODAL
// ─────────────────────────────────────────────────────────────
const ProfileInfoModal: React.FC<{
  visible: boolean;
  profile: AdminProfile | null;
  onClose: () => void;
}> = ({ visible, profile, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalBox, { paddingBottom: 28 }]}>
        <Text style={styles.modalTitle}>Profile Information</Text>
        {[
          { label: "Full Name",    value: profile?.fullName,    icon: "person-outline"   as IoniconsName },
          { label: "Admin ID",     value: profile?.adminId,     icon: "card-outline"     as IoniconsName },
          { label: "CNIC Number",  value: profile?.cnicNumber,  icon: "id-card-outline"  as IoniconsName },
          { label: "Email",        value: profile?.email,       icon: "mail-outline"     as IoniconsName },
          { label: "Mobile",       value: profile?.mobileNumber,icon: "call-outline"     as IoniconsName },
          { label: "Role",         value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Admin", icon: "shield-outline" as IoniconsName },
          { label: "Registered On",value: formatDate(profile?.createdAt), icon: "calendar-outline" as IoniconsName },
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
          <Text style={styles.modalCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─────────────────────────────────────────────────────────────
// ROLES & PERMISSIONS MODAL
// ─────────────────────────────────────────────────────────────
const RolesModal: React.FC<{
  visible: boolean;
  profile: AdminProfile | null;
  onClose: () => void;
}> = ({ visible, profile, onClose }) => {
  const allPermissions = [
    { key: "manage_consumers",  label: "Manage Consumers",   icon: "people-outline"         as IoniconsName },
    { key: "view_reports",      label: "View Reports",        icon: "bar-chart-outline"      as IoniconsName },
    { key: "manage_cases",      label: "Manage Cases",        icon: "briefcase-outline"      as IoniconsName },
    { key: "upload_csv",        label: "Upload CSV Data",     icon: "cloud-upload-outline"   as IoniconsName },
    { key: "send_notifications",label: "Send Notifications",  icon: "notifications-outline"  as IoniconsName },
    { key: "manage_admins",     label: "Manage Admins",       icon: "shield-outline"         as IoniconsName },
  ];

  const granted = profile?.permissions ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { paddingBottom: 28 }]}>
          <Text style={styles.modalTitle}>Roles & Permissions</Text>

          {/* Role badge */}
          <View style={[styles.roleBadge, { marginBottom: 16 }]}>
            <Ionicons name="shield-checkmark" size={13} color="#2B4C7E" />
            <Text style={styles.roleBadgeText}>
              {profile?.role
                ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
                : "Admin"}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { marginBottom: 10, alignSelf: "flex-start" }]}>
            Permissions
          </Text>

          {allPermissions.map(({ key, label, icon }) => {
            const hasPermission = granted.includes(key) || profile?.role === "super_admin";
            return (
              <View key={key} style={styles.permRow}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={icon} size={16} color="#718096" />
                </View>
                <Text style={[styles.menuLabel, { flex: 1, fontSize: 13 }]}>{label}</Text>
                <View style={[styles.permBadge, { backgroundColor: hasPermission ? "#E6F4EA" : "#FFF0F0" }]}>
                  <Ionicons
                    name={hasPermission ? "checkmark-circle" : "close-circle"}
                    size={14}
                    color={hasPermission ? "#2E7D32" : "#C62828"}
                  />
                  <Text style={[styles.permBadgeText, { color: hasPermission ? "#2E7D32" : "#C62828" }]}>
                    {hasPermission ? "Granted" : "Denied"}
                  </Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 16 }]} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
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
  profile: AdminProfile | null;
  onClose: () => void;
}> = ({ visible, profile, onClose }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld,     setShowOld]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);

  const reset = () => {
    setOldPassword(""); setNewPassword(""); setConfirmPass("");
    setShowOld(false); setShowNew(false); setShowConfirm(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleForgotPassword = () => {
    handleClose();
    router.push({ pathname: "/screens/ForgotPasswordScreen" as any, params: { portal: "admin" } });
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPass) {
      Alert.alert("Error", "Please fill in all fields."); return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters."); return;
    }
    if (newPassword !== confirmPass) {
      Alert.alert("Error", "New passwords do not match."); return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No user found.");

      if (profile?.passwordEncoded) {
        const storedOld = Buffer.from(profile.passwordEncoded, "base64").toString("utf8");
        if (oldPassword !== storedOld) {
          Alert.alert("Incorrect Password", "Old password is wrong.", [
            { text: "Forgot Password?", onPress: handleForgotPassword },
            { text: "Try Again", style: "cancel" },
          ]);
          setLoading(false); return;
        }
      }

      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      const newHash    = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPassword);
      const newEncoded = Buffer.from(newPassword).toString("base64");

      await updateDoc(doc(db, "admins", user.uid), {
        passwordHash: newHash, passwordEncoded: newEncoded,
      });

      Alert.alert("Success ✅", "Password updated successfully!");
      handleClose();
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        Alert.alert("Incorrect Password", "Old password is wrong.", [
          { text: "Forgot Password?", onPress: handleForgotPassword },
          { text: "Try Again", style: "cancel" },
        ]);
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert("Too Many Attempts", "Please try again later.");
      } else {
        Alert.alert("Error", error.message || "Failed to update password.");
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
          <Text style={styles.modalTitle}>Change Password</Text>
          <Text style={styles.modalMessage}>Enter your old password to continue.</Text>
          {PasswordField(oldPassword, setOldPassword, "Old password",         showOld,     () => setShowOld(v => !v))}
          {PasswordField(newPassword, setNewPassword, "New password",         showNew,     () => setShowNew(v => !v))}
          {PasswordField(confirmPass, setConfirmPass, "Confirm new password", showConfirm, () => setShowConfirm(v => !v))}
          <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: "flex-end", marginBottom: 16 }}>
            <Text style={{ color: "#2B4C7E", fontSize: 12, fontWeight: "600" }}>Forgot Password?</Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleChangePassword} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalLogoutText}>Confirm</Text>}
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
const PrivacyPolicyModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalBox, { maxHeight: "85%", paddingBottom: 24 }]}>
        <Text style={styles.modalTitle}>Privacy Policy</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
          {[
            { heading: "1. Data Collection",   body: "ElectraGuard collects admin credentials, case management data, and consumer records to provide electricity monitoring services." },
            { heading: "2. Data Usage",        body: "Admin data is used solely for system management, case resolution, and theft detection. We do not sell or share data with third parties." },
            { heading: "3. Data Storage",      body: "All data is securely stored in Firebase (Google Cloud). Passwords are encrypted using SHA-256 hashing before storage." },
            { heading: "4. Authentication",    body: "Firebase Authentication is used for secure admin login. Role-based access controls data visibility." },
            { heading: "5. Your Rights",       body: "Admins may request account deletion by contacting the system owner. All associated data will be permanently removed." },
            { heading: "6. Security",          body: "We implement industry-standard security including encrypted transmission, hashed passwords, and regular audits." },
            { heading: "7. Contact",           body: "For queries, contact support@electraguard.pk or through the Support section." },
          ].map(({ heading, body }) => (
            <View key={heading} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1A202C", marginBottom: 4 }}>{heading}</Text>
              <Text style={{ fontSize: 12, color: "#4A5568", lineHeight: 18 }}>{body}</Text>
            </View>
          ))}
          <Text style={{ fontSize: 11, color: "#A0AEC0", marginTop: 8, textAlign: "center" }}>
            Last updated: April 2026 • ElectraGuard v1.0.0
          </Text>
        </ScrollView>
        <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 16 }]} onPress={onClose}>
          <Text style={styles.modalCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function ProfileScreen(): React.ReactElement {
  const [profile,          setProfile]          = useState<AdminProfile | null>(null);
  const [stats,            setStats]            = useState<AdminStats>({ casesHandled: 0, resolved: 0, successRate: 0 });
  const [loading,          setLoading]          = useState(true);
  const [loggingOut,       setLoggingOut]       = useState(false);
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPassModal,    setShowPassModal]    = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showRolesModal,   setShowRolesModal]   = useState(false);

  // ── Fetch admin profile + stats ────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { router.replace("/screens/LoginScreen"); return; }

        // ── Admin profile from "admins" collection ──
        const snap = await getDoc(doc(db, "admins", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            fullName:        d.fullName        || user.displayName || "Admin",
            email:           d.email           || user.email       || "",
            mobileNumber:    d.mobileNumber    || d.phone          || "",
            adminId:         d.adminId         || d.consumerId     || "—",
            cnicNumber:      d.cnicNumber      || "—",
            role:            d.role            || "admin",
            permissions:     d.permissions     || [],
            createdAt:       d.createdAt,
            passwordEncoded: d.passwordEncoded || "",
          });
        } else {
          setProfile({
            fullName: user.displayName || "Admin",
            email: user.email || "",
            mobileNumber: "", adminId: "—", cnicNumber: "—",
            role: "admin", permissions: [], createdAt: null,
          });
        }

        // ── Stats: count cases assigned to this admin ──
        const casesSnap = await getDocs(
          query(collection(db, "cases"), where("assignedAdminId", "==", user.uid))
        );
        const allCases   = casesSnap.docs.map(d => d.data());
        const total      = allCases.length;
        const resolved   = allCases.filter(c => c.status === "resolved").length;
        const rate       = total > 0 ? Math.round((resolved / total) * 100) : 0;

        setStats({ casesHandled: total, resolved, successRate: rate });
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/screens/LoginScreen");
    } catch {
      Alert.alert("Error", "Logout nahi ho saka. Dobara try karein.");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2B4C7E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ── */}
        <View style={styles.profileHeader}>
          <AvatarInitials name={profile?.fullName || "?"} />
          <Text style={styles.profileName}>{profile?.fullName || "Admin"}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#2B4C7E" />
            <Text style={styles.roleBadgeText}>
              {profile?.role
                ? profile.role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                : "Admin"}
            </Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <StatsRow stats={stats} />

        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <MenuRow
            icon="person-outline"
            label="Profile Information"
            subtitle={`${profile?.fullName?.split(" ")[0]} • ID: ${profile?.adminId}`}
            onPress={() => setShowProfileModal(true)}
          />
          <View style={styles.divider} />
          <MenuRow icon="mail-outline"  label="Email" subtitle={profile?.email || "—"} showChevron={false} />
          <View style={styles.divider} />
          <MenuRow icon="call-outline"  label="Phone" subtitle={profile?.mobileNumber || "—"} showChevron={false} />
          <View style={styles.divider} />
          <MenuRow
            icon="shield-outline"
            label="Roles & Permissions"
            subtitle={profile?.role?.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Admin"}
            onPress={() => setShowRolesModal(true)}
          />
        </View>

        {/* ── Preferences ── */}
        <SectionHeader title="Preferences" />
        <View style={styles.card}>
          <MenuRow
            icon="notifications-outline"
            label="Notifications"
            subtitle="Push notifications enabled"
            onPress={() => Alert.alert("Notifications", "You will receive push notifications for new cases, alerts, and consumer risk updates.", [{ text: "OK" }])}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="settings-outline"
            label="System Settings"
            onPress={() => Alert.alert("System Settings", "App Language: English\nTheme: Light\nData Sync: Auto\nCache: Cleared on logout", [{ text: "OK" }])}
          />
        </View>

        {/* ── Security ── */}
        <SectionHeader title="Security" />
        <View style={styles.card}>
          <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => setShowPassModal(true)} />
          <View style={styles.divider} />
          <MenuRow icon="shield-outline" label="Two-Factor Authentication" subtitle="Coming soon" showChevron={false} />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <MenuRow icon="information-circle-outline" label="App Version" subtitle="v1.0.0 (Build 100) — ElectraGuard" showChevron={false} />
          <View style={styles.divider} />
          <MenuRow icon="document-text-outline" label="Privacy Policy" onPress={() => setShowPrivacyModal(true)} />
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
            : <><Ionicons name="log-out-outline" size={18} color="#fff" /><Text style={styles.logoutText}>Logout</Text></>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 ElectraGuard System</Text>
          <Text style={styles.footerText}>Government Enterprise Solution</Text>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <ProfileInfoModal  visible={showProfileModal} profile={profile} onClose={() => setShowProfileModal(false)} />
      <RolesModal        visible={showRolesModal}   profile={profile} onClose={() => setShowRolesModal(false)} />
      <ChangePasswordModal visible={showPassModal}  profile={profile} onClose={() => setShowPassModal(false)} />
      <PrivacyPolicyModal  visible={showPrivacyModal}                 onClose={() => setShowPrivacyModal(false)} />

      {/* ── Logout Confirmation ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconBox}>
              <Ionicons name="log-out-outline" size={28} color="#E53E3E" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
                <Text style={styles.modalLogoutText}>Logout</Text>
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
  safeArea:      { flex: 1, backgroundColor: "#F7F8FC" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  centered:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8FC", gap: 12 },
  loadingText:   { color: "#718096", fontSize: 14 },

  profileHeader: { alignItems: "center", paddingVertical: 24 },
  avatarCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: "#2B4C7E", justifyContent: "center", alignItems: "center", marginTop: 20, marginBottom: 12, shadowColor: "#2B4C7E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  avatarText:    { color: "#fff", fontSize: 26, fontWeight: "800" },
  profileName:   { fontSize: 20, fontWeight: "800", color: "#1A202C", marginBottom: 6 },
  roleBadge:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EBF4FF", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontSize: 12, fontWeight: "700", color: "#2B4C7E" },

  // Stats
  statsRow:   { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard:   { flex: 1, backgroundColor: "#2B6CB0", borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: "#2B6CB0", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  statValue:  { fontSize: 22, fontWeight: "800", color: "#fff" },
  statLabel:  { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "center" },

  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#A0AEC0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 8, marginLeft: 4 },

  card:        { backgroundColor: "#fff", borderRadius: 14, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: "hidden" },
  menuRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  menuIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F7F8FC", justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuTextBox: { flex: 1 },
  menuLabel:   { fontSize: 14, fontWeight: "600", color: "#1A202C" },
  menuSubtitle:{ fontSize: 12, color: "#718096", marginTop: 1 },
  divider:     { height: 1, backgroundColor: "#F1F5F9", marginLeft: 60 },

  // Permissions modal
  permRow:       { flexDirection: "row", alignItems: "center", width: "100%", paddingVertical: 8, gap: 10 },
  permBadge:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  permBadgeText: { fontSize: 11, fontWeight: "700" },

  logoutBtn:  { backgroundColor: "#E53E3E", borderRadius: 12, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, marginBottom: 20, shadowColor: "#E53E3E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footer:     { alignItems: "center", gap: 2, marginBottom: 8 },
  footerText: { fontSize: 11, color: "#A0AEC0" },

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

  infoRow:     { flexDirection: "row", alignItems: "flex-start", width: "100%", marginBottom: 12, gap: 10 },
  infoIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#EBF4FF", justifyContent: "center", alignItems: "center" },
  infoLabel:   { fontSize: 11, color: "#A0AEC0", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:   { fontSize: 14, color: "#1A202C", fontWeight: "600", marginTop: 1 },

  passInputWrapper: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, marginBottom: 10 },
  passInput:        { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1F2933" },
});