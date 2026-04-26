// ProfileScreen.tsx
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Consumer Profile Screen (TypeScript)
// Firebase Auth se user data fetch karta hai
// Logout karke LoginScreen par redirect karta hai
// ─────────────────────────────────────────────────────────────
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role?: string;
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
// AVATAR INITIALS COMPONENT
// ─────────────────────────────────────────────────────────────
const AvatarInitials: React.FC<{ name: string }> = ({ name }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarText}>{initials || "?"}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MENU ROW COMPONENT
// ─────────────────────────────────────────────────────────────
const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  showChevron = true,
  labelColor = "#1A202C",
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
    {showChevron && (
      <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
    )}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function ProfileScreen(): React.ReactElement {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // ── Fetch user profile from Firestore ──────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/screens/LoginScreen");
          return;
        }

        // Try consumers collection first, then users
        let userData: UserProfile | null = null;

        const consumerRef = doc(db, "consumers", user.uid);
        const consumerSnap = await getDoc(consumerRef);

        if (consumerSnap.exists()) {
          const d = consumerSnap.data();
          userData = {
            name: d.name || d.fullName || "Consumer",
            email: d.email || user.email || "",
            phone: d.phone || d.phoneNumber || "",
            role: d.role || "Consumer",
          };
        } else {
          // Fallback to users collection
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const d = userSnap.data();
            userData = {
              name: d.name || d.fullName || "User",
              email: d.email || user.email || "",
              phone: d.phone || d.phoneNumber || "",
              role: d.role || "User",
            };
          } else {
            // Use auth data as fallback
            userData = {
              name: user.displayName || "Consumer",
              email: user.email || "",
              phone: user.phoneNumber || "",
              role: "Consumer",
            };
          }
        }

        setProfile(userData);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ── Logout handler ─────────────────────────────────────────
  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/screens/LoginScreen");
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert("Error", "Logout nahi ho saka. Dobara try karein.");
    } finally {
      setLoggingOut(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // ── Main UI ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ── */}
        <View style={styles.profileHeader}>
          <AvatarInitials name={profile?.name || "?"} />
          <Text style={styles.profileName}>{profile?.name || "Consumer"}</Text>
          {!!profile?.role && (
            <Text style={styles.profileRole}>{profile.role}</Text>
          )}
        </View>

        {/* ── Account Section ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <MenuRow
            icon="person-outline"
            label="Profile Information"
            subtitle={profile?.name || ""}
            onPress={() =>
              Alert.alert("Coming Soon", "Profile edit feature coming soon!")
            }
          />
          <View style={styles.divider} />
          <MenuRow
            icon="mail-outline"
            label="Email"
            subtitle={profile?.email || ""}
            onPress={() =>
              Alert.alert("Email", profile?.email || "No email found")
            }
          />
          <View style={styles.divider} />
          <MenuRow
            icon="call-outline"
            label="Phone"
            subtitle={profile?.phone || "Not set"}
            onPress={() =>
              Alert.alert("Phone", profile?.phone || "No phone found")
            }
          />
        </View>

        {/* ── Preferences Section ── */}
        <SectionHeader title="Preferences" />
        <View style={styles.card}>
          <MenuRow
            icon="notifications-outline"
            label="Notifications"
            subtitle="Enabled"
            onPress={() =>
              Alert.alert("Coming Soon", "Notification settings coming soon!")
            }
          />
          <View style={styles.divider} />
          <MenuRow
            icon="settings-outline"
            label="System Settings"
            onPress={() =>
              Alert.alert("Coming Soon", "System settings coming soon!")
            }
          />
        </View>

        {/* ── Security Section ── */}
        <SectionHeader title="Security" />
        <View style={styles.card}>
          <MenuRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() =>
              Alert.alert("Coming Soon", "Change password feature coming soon!")
            }
          />
          <View style={styles.divider} />
          <MenuRow
            icon="shield-outline"
            label="Two-Factor Authentication"
            subtitle="Enabled"
            onPress={() =>
              Alert.alert("Coming Soon", "2FA settings coming soon!")
            }
          />
        </View>

        {/* ── About Section ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <MenuRow
            icon="settings-outline"
            label="App Version"
            subtitle="v2.4.1 (Build 245)"
            showChevron={false}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() =>
              Alert.alert("Coming Soon", "Privacy policy coming soon!")
            }
          />
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 ElectraGuard System</Text>
          <Text style={styles.footerText}>Government Enterprise Solution</Text>
        </View>
      </ScrollView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconBox}>
              <Ionicons name="log-out-outline" size={28} color="#E53E3E" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Kya aap wakai logout karna chahte hain?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
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
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FC",
    gap: 12,
  },
  loadingText: { color: "#718096", fontSize: 14 },

  // Profile header
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2B4C7E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#2B4C7E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  profileName: { fontSize: 20, fontWeight: "800", color: "#1A202C" },
  profileRole: { fontSize: 13, color: "#718096", marginTop: 3 },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0AEC0",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },

  // Menu row
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F7F8FC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextBox: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "600", color: "#1A202C" },
  menuSubtitle: { fontSize: 12, color: "#718096", marginTop: 1 },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 60,
  },

  // Logout button
  logoutBtn: {
    backgroundColor: "#E53E3E",
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#E53E3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Footer
  footer: { alignItems: "center", gap: 2, marginBottom: 8 },
  footerText: { fontSize: 11, color: "#A0AEC0" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A202C", marginBottom: 8 },
  modalMessage: {
    fontSize: 13,
    color: "#718096",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { color: "#4A5568", fontWeight: "700", fontSize: 14 },
  modalLogoutBtn: {
    flex: 1,
    backgroundColor: "#E53E3E",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalLogoutText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});