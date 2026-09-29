// app/src/Admin/ProfileScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from "firebase/auth";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Language, Theme } from "../../../constants/translations";
import { auth, db } from "../../../firebaseConfig";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { useCasesList } from "../../../hooks/useCasesApi";

// Firestore collection where admin profiles live. Change if yours is different.
const ADMIN_COLLECTION = "admins";
const TEAL = "#1FA39A";
const NAVY = "#0B3C5D";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type FirestoreDate =
  | { toDate: () => Date }
  | Date
  | string
  | number
  | null
  | undefined;

interface AdminProfile {
  fullName: string;
  email: string;
  mobileNumber: string;
  role: string;
  createdAt: FirestoreDate;
}

interface MenuRowProps {
  icon: IoniconsName;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

interface PolicySection {
  heading: string;
  body: string;
}

interface ExtraStrings {
  adminProfile: string;
  superAdmin: string;
  casesHandled: string;
  resolved: string;
  successRate: string;
  rolesPerms: string;
  enabled: string;
  registeredOn: string;
  fillAll: string;
  tooMany: string;
  logoutFailed: string;
  updateFailed: string;
  recentLogin: string;
  noUser: string;
  footerLine1: string;
  footerLine2: string;
  policy: PolicySection[];
}

// ─────────────────────────────────────────────────────────────
// EXTRA TRANSLATIONS
// ─────────────────────────────────────────────────────────────
const EXTRA: Record<string, ExtraStrings> = {
  en: {
    adminProfile: "Admin Profile",
    superAdmin: "Super Administrator",
    casesHandled: "Cases Handled",
    resolved: "Resolved",
    successRate: "Success Rate",
    rolesPerms: "Roles & Permissions",
    enabled: "Enabled",
    registeredOn: "Registered On",
    fillAll: "Please fill in all fields.",
    tooMany: "Too many attempts. Please try again later.",
    logoutFailed: "Logout failed. Please try again.",
    updateFailed: "Failed to update password.",
    recentLogin: "For security, please log in again and retry.",
    noUser: "No user found.",
    footerLine1: "© 2026 Utility Guard System",
    footerLine2: "Government Enterprise Solution",
    policy: [
      {
        heading: "1. Data Collection",
        body: "ElectraGuard collects your name, CNIC, email, mobile number, Consumer ID, and electricity consumption data (CSV uploads) to provide electricity monitoring services.",
      },
      {
        heading: "2. Data Usage",
        body: "Your data is used solely to detect electricity theft, calculate consumption, and generate risk scores. We do not sell or share your data with third parties.",
      },
      {
        heading: "3. Data Storage",
        body: "All data is securely stored in Firebase (Google Cloud). Passwords are managed by Firebase Authentication and are never stored in plain text.",
      },
      {
        heading: "4. Authentication",
        body: "We use Firebase Authentication for secure login. OTP verification is used for password recovery and two-factor authentication.",
      },
      {
        heading: "5. Your Rights",
        body: "You may request deletion of your account and associated data by contacting our support team.",
      },
      {
        heading: "6. Security",
        body: "We follow industry-standard security practices including encrypted data transmission, secure password handling, and regular security reviews.",
      },
      {
        heading: "7. Contact",
        body: "For privacy-related queries, contact us at support@electraguard.pk or through the Support section in the app.",
      },
    ],
  },
  ur_roman: {
    adminProfile: "Admin Profile",
    superAdmin: "Super Administrator",
    casesHandled: "Cases Handle Kiye",
    resolved: "Hal Hue",
    successRate: "Kamyabi Ki Sharah",
    rolesPerms: "Roles & Permissions",
    enabled: "Faal",
    registeredOn: "Registration Ki Tareekh",
    fillAll: "Baraye meharbani tamam fields bharein.",
    tooMany: "Bohat zyada koshishein ho gayin. Baad mai dobara koshish karein.",
    logoutFailed: "Logout nahi ho saka. Dobara koshish karein.",
    updateFailed: "Password update nahi ho saka.",
    recentLogin: "Security ke liye dobara login karein aur phir koshish karein.",
    noUser: "User nahi mila.",
    footerLine1: "© 2026 Utility Guard System",
    footerLine2: "Sarkari Enterprise Solution",
    policy: [
      {
        heading: "1. Data ka Jama Karna",
        body: "ElectraGuard aap ka naam, CNIC, email, mobile number, Consumer ID aur bijli ki khapat ka data (CSV uploads) bijli ki monitoring ki service dene ke liye jama karta hai.",
      },
      {
        heading: "2. Data ka Istemal",
        body: "Aap ka data sirf bijli chori pakadne, khapat calculate karne aur risk score banane ke liye istemal hota hai. Hum aap ka data kisi teesray fareeq ko farokht ya share nahi karte.",
      },
      {
        heading: "3. Data ki Hifazat",
        body: "Tamam data Firebase (Google Cloud) mai mehfooz hai. Passwords Firebase Authentication sambhalta hai aur yeh kabhi plain text mai store nahi hote.",
      },
      {
        heading: "4. Authentication",
        body: "Mehfooz login ke liye Firebase Authentication istemal hoti hai. Password recovery aur two-factor authentication ke liye OTP verification istemal hoti hai.",
      },
      {
        heading: "5. Aap ke Huqooq",
        body: "Aap hamari support team se rabta kar ke apna account aur us se mutaliq data delete karne ki darkhwast kar sakte hain.",
      },
      {
        heading: "6. Security",
        body: "Hum industry-standard security practices apnate hain, jin mai encrypted data transmission, mehfooz password handling aur security ka baqaida jaiza shamil hai.",
      },
      {
        heading: "7. Rabta",
        body: "Privacy se mutaliq sawalat ke liye support@electraguard.pk par ya app ke Support section se rabta karein.",
      },
    ],
  },
  ur: {
    adminProfile: "ایڈمن پروفائل",
    superAdmin: "سپر ایڈمنسٹریٹر",
    casesHandled: "نمٹائے گئے کیسز",
    resolved: "حل شدہ",
    successRate: "کامیابی کی شرح",
    rolesPerms: "کردار اور اجازتیں",
    enabled: "فعال",
    registeredOn: "رجسٹریشن کی تاریخ",
    fillAll: "براہ کرم تمام خانے پُر کریں۔",
    tooMany: "بہت زیادہ کوششیں ہو چکی ہیں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔",
    logoutFailed: "لاگ آؤٹ نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    updateFailed: "پاس ورڈ اپڈیٹ نہیں ہو سکا۔",
    recentLogin: "سیکیورٹی کے لیے دوبارہ لاگ اِن کریں اور پھر کوشش کریں۔",
    noUser: "صارف نہیں ملا۔",
    footerLine1: "© 2026 Utility Guard System",
    footerLine2: "سرکاری انٹرپرائز سلوشن",
    policy: [
      {
        heading: "1. ڈیٹا اکٹھا کرنا",
        body: "ElectraGuard آپ کا نام، CNIC، ای میل، موبائل نمبر، کنزیومر آئی ڈی اور بجلی کی کھپت کا ڈیٹا (CSV اپ لوڈز) بجلی کی نگرانی کی سروس فراہم کرنے کے لیے جمع کرتا ہے۔",
      },
      {
        heading: "2. ڈیٹا کا استعمال",
        body: "آپ کا ڈیٹا صرف بجلی چوری کا پتا لگانے، کھپت کا حساب لگانے اور رسک اسکور بنانے کے لیے استعمال ہوتا ہے۔ ہم آپ کا ڈیٹا کسی تیسرے فریق کو فروخت یا شیئر نہیں کرتے۔",
      },
      {
        heading: "3. ڈیٹا کا ذخیرہ",
        body: "تمام ڈیٹا Firebase (Google Cloud) میں محفوظ طریقے سے رکھا جاتا ہے۔ پاس ورڈ Firebase Authentication کے ذریعے سنبھالے جاتے ہیں اور کبھی سادہ متن میں محفوظ نہیں کیے جاتے۔",
      },
      {
        heading: "4. تصدیق",
        body: "محفوظ لاگ اِن کے لیے Firebase Authentication استعمال ہوتی ہے۔ پاس ورڈ کی بازیابی اور ٹو فیکٹر تصدیق کے لیے OTP استعمال ہوتا ہے۔",
      },
      {
        heading: "5. آپ کے حقوق",
        body: "آپ ہماری سپورٹ ٹیم سے رابطہ کر کے اپنا اکاؤنٹ اور متعلقہ ڈیٹا حذف کرنے کی درخواست کر سکتے ہیں۔",
      },
      {
        heading: "6. سیکیورٹی",
        body: "ہم صنعتی معیار کے مطابق سیکیورٹی اقدامات اپناتے ہیں، جن میں انکرپٹڈ ڈیٹا ٹرانسمیشن، پاس ورڈ کا محفوظ انتظام اور سیکیورٹی کا باقاعدہ جائزہ شامل ہے۔",
      },
      {
        heading: "7. رابطہ",
        body: "پرائیویسی سے متعلق سوالات کے لیے support@electraguard.pk پر یا ایپ کے سپورٹ سیکشن کے ذریعے رابطہ کریں۔",
      },
    ],
  },
  ar: {
    adminProfile: "ملف المسؤول",
    superAdmin: "مسؤول أعلى",
    casesHandled: "القضايا المعالجة",
    resolved: "تم الحل",
    successRate: "معدل النجاح",
    rolesPerms: "الأدوار والصلاحيات",
    enabled: "مفعّل",
    registeredOn: "تاريخ التسجيل",
    fillAll: "يرجى ملء جميع الحقول.",
    tooMany: "محاولات كثيرة جدًا. يرجى المحاولة لاحقًا.",
    logoutFailed: "فشل تسجيل الخروج. حاول مرة أخرى.",
    updateFailed: "فشل تحديث كلمة المرور.",
    recentLogin: "لأسباب أمنية، يرجى تسجيل الدخول مرة أخرى ثم المحاولة.",
    noUser: "لم يتم العثور على المستخدم.",
    footerLine1: "© 2026 Utility Guard System",
    footerLine2: "حل مؤسسي حكومي",
    policy: [
      {
        heading: "1. جمع البيانات",
        body: "يجمع ElectraGuard اسمك ورقم الهوية الوطنية (CNIC) وبريدك الإلكتروني ورقم هاتفك المحمول ومعرّف المستهلك وبيانات استهلاك الكهرباء (ملفات CSV) لتقديم خدمات مراقبة الكهرباء.",
      },
      {
        heading: "2. استخدام البيانات",
        body: "تُستخدم بياناتك فقط للكشف عن سرقة الكهرباء وحساب الاستهلاك وإنشاء درجات المخاطر. لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة.",
      },
      {
        heading: "3. تخزين البيانات",
        body: "تُخزَّن جميع البيانات بشكل آمن في Firebase (Google Cloud). تتم إدارة كلمات المرور عبر Firebase Authentication ولا تُخزَّن أبدًا كنص عادي.",
      },
      {
        heading: "4. المصادقة",
        body: "نستخدم Firebase Authentication لتسجيل دخول آمن. يُستخدم رمز التحقق (OTP) لاستعادة كلمة المرور والمصادقة الثنائية.",
      },
      {
        heading: "5. حقوقك",
        body: "يمكنك طلب حذف حسابك والبيانات المرتبطة به عبر التواصل مع فريق الدعم لدينا.",
      },
      {
        heading: "6. الأمان",
        body: "نطبّق ممارسات أمان معيارية تشمل تشفير نقل البيانات والإدارة الآمنة لكلمات المرور ومراجعات أمنية دورية.",
      },
      {
        heading: "7. التواصل",
        body: "للاستفسارات المتعلقة بالخصوصية، تواصل معنا عبر support@electraguard.pk أو من خلال قسم الدعم في التطبيق.",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const formatDate = (ts: FirestoreDate): string => {
  if (!ts) return "—";
  const date =
    typeof ts === "object" && "toDate" in ts
      ? ts.toDate()
      : new Date(ts as string | number | Date);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// "super_admin" -> "Super Admin"
const humanizeRole = (role: string): string =>
  role
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  showChevron = true,
}) => {
  const { colors } = useAppSettings();
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress}
    >
      <View style={[styles.menuIconBox, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={18} color={colors.subText} />
      </View>
      <View style={styles.menuTextBox}>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        {!!subtitle && (
          <Text style={[styles.menuSubtitle, { color: colors.subText }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.subText} />
      )}
    </TouchableOpacity>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => {
  const { colors } = useAppSettings();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  );
};

const StatCard: React.FC<{ value: string; label: string }> = ({
  value,
  label,
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

interface PasswordFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}

// Module-level so the input doesn't lose focus on re-render
const PasswordField: React.FC<PasswordFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  show,
  onToggle,
}) => {
  const { colors } = useAppSettings();
  return (
    <View
      style={[
        styles.passInputWrapper,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <TextInput
        style={[styles.passInput, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onToggle} style={{ paddingHorizontal: 12 }}>
        <Ionicons
          name={show ? "eye-off-outline" : "eye-outline"}
          size={18}
          color={colors.subText}
        />
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// SYSTEM SETTINGS MODAL
// ─────────────────────────────────────────────────────────────
const SystemSettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { t, language, theme, setLanguage, setTheme, colors } =
    useAppSettings();

  const languages: { key: Language; label: string }[] = [
    { key: "en", label: "English" },
    { key: "ur_roman", label: "اردو (Roman)" },
    { key: "ur", label: "اردو" },
    { key: "ar", label: "العربية" },
  ];

  const themes: { key: Theme; label: string; icon: IoniconsName }[] = [
    { key: "light", label: t.themeLight, icon: "sunny-outline" },
    { key: "dark", label: t.themeDark, icon: "moon-outline" },
    { key: "system", label: t.themeSystem, icon: "phone-portrait-outline" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            { paddingBottom: 28, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t.settingsTitle}
          </Text>

          <Text style={[styles.settingsSection, { color: colors.subText }]}>
            {t.appLanguage}
          </Text>
          <View style={styles.optionsGrid}>
            {languages.map(({ key, label }) => {
              const active = language === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionPill,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    active && styles.optionPillActive,
                  ]}
                  onPress={() => setLanguage(key)}
                  activeOpacity={0.7}
                >
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.optionPillText,
                      { color: colors.text },
                      active && styles.optionPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.settingsSection, { color: colors.subText }]}>
            {t.appTheme}
          </Text>
          <View style={styles.themeRow}>
            {themes.map(({ key, label, icon }) => {
              const active = theme === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    active && styles.themeCardActive,
                  ]}
                  onPress={() => setTheme(key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon}
                    size={22}
                    color={active ? "#fff" : colors.subText}
                  />
                  <Text
                    style={[
                      styles.themeCardText,
                      { color: colors.subText },
                      active && styles.themeCardTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#fff"
                      style={{ marginTop: 2 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.settingsInfoRow}>
            <Ionicons name="sync-outline" size={16} color={colors.subText} />
            <Text style={[styles.settingsInfoText, { color: colors.subText }]}>
              {t.dataSync}: {t.dataSyncSub}
            </Text>
          </View>
          <View style={styles.settingsInfoRow}>
            <Ionicons name="trash-outline" size={16} color={colors.subText} />
            <Text style={[styles.settingsInfoText, { color: colors.subText }]}>
              {t.cacheInfo}: {t.cacheInfoSub}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.modalCloseBtn, { marginTop: 20 }]}
            onPress={onClose}
          >
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
  visible: boolean;
  profile: AdminProfile | null;
  roleTitle: string;
  onClose: () => void;
}> = ({ visible, profile, roleTitle, onClose }) => {
  const { t, colors, language } = useAppSettings();
  const extra = EXTRA[language] ?? EXTRA.en;

  const rows: { label: string; value?: string; icon: IoniconsName }[] = [
    { label: t.fullName, value: profile?.fullName, icon: "person-outline" },
    { label: t.email, value: profile?.email, icon: "mail-outline" },
    { label: t.mobileNumber, value: profile?.mobileNumber, icon: "call-outline" },
    { label: t.role, value: roleTitle, icon: "shield-outline" },
    {
      label: extra.registeredOn,
      value: formatDate(profile?.createdAt),
      icon: "calendar-outline",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            { paddingBottom: 28, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t.profileInfo}
          </Text>
          {rows.map(({ label, value, icon }) => (
            <View key={label} style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name={icon} size={16} color={NAVY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.subText }]}>
                  {label}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {value || "—"}
                </Text>
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
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { t, colors, language } = useAppSettings();
  const extra = EXTRA[language] ?? EXTRA.en;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPass("");
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleForgotPassword = () => {
    handleClose();
    router.push({
      pathname: "/src/screens/ForgotPasswordScreen" as any,
      params: { portal: "admin" },
    });
  };

  const showWrongPasswordAlert = () => {
    Alert.alert(t.error, t.incorrectPass, [
      { text: t.forgotPassword, onPress: handleForgotPassword },
      { text: t.cancel, style: "cancel" },
    ]);
  };

  const handleChangePassword = async () => {
    if (loading) return;

    if (!oldPassword || !newPassword || !confirmPass) {
      Alert.alert(t.error, extra.fillAll);
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t.error, t.passShort);
      return;
    }
    if (newPassword !== confirmPass) {
      Alert.alert(t.error, t.passMismatch);
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error(extra.noUser);

      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      // Remove legacy insecure fields if they exist. Failure here is harmless.
      try {
        await updateDoc(doc(db, ADMIN_COLLECTION, user.uid), {
          passwordHash: deleteField(),
          passwordEncoded: deleteField(),
        });
      } catch (cleanupErr) {
        console.warn("Legacy password field cleanup skipped:", cleanupErr);
      }

      Alert.alert(`${t.success} ✅`, t.passUpdated);
      handleClose();
    } catch (error: any) {
      switch (error?.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          showWrongPasswordAlert();
          break;
        case "auth/too-many-requests":
          Alert.alert(t.error, extra.tooMany);
          break;
        case "auth/requires-recent-login":
          Alert.alert(t.error, extra.recentLogin);
          break;
        default:
          Alert.alert(t.error, error?.message || extra.updateFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.changePassTitle}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.subText }]}>
              {t.changePassSub}
            </Text>

            <PasswordField
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder={t.oldPassword}
              show={showOld}
              onToggle={() => setShowOld((v) => !v)}
            />
            <PasswordField
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t.newPassword}
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />
            <PasswordField
              value={confirmPass}
              onChangeText={setConfirmPass}
              placeholder={t.confirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={{ alignSelf: "flex-end", marginBottom: 16 }}
            >
              <Text style={{ color: NAVY, fontSize: 12, fontWeight: "600" }}>
                {t.forgotPassword}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: colors.background },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>{t.confirm}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// PRIVACY POLICY MODAL
// ─────────────────────────────────────────────────────────────
const PrivacyPolicyModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { t, colors, language } = useAppSettings();
  const extra = EXTRA[language] ?? EXTRA.en;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            { maxHeight: "85%", paddingBottom: 24, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t.privacyTitle}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
            {extra.policy.map(({ heading, body }) => (
              <View key={heading} style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  {heading}
                </Text>
                <Text
                  style={{ fontSize: 12, color: colors.subText, lineHeight: 18 }}
                >
                  {body}
                </Text>
              </View>
            ))}
            <Text
              style={{
                fontSize: 11,
                color: colors.subText,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {t.lastUpdated}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalCloseBtn, { marginTop: 16 }]}
            onPress={onClose}
          >
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
  const extra = EXTRA[language] ?? EXTRA.en;

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showPassModal, setShowPassModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Live stats from the same API the Cases screen uses
  const { counts: rawCounts, total: rawTotal } = useCasesList("All");
  const totalCases = rawTotal ?? 0;
  const resolvedCases = rawCounts?.Closed ?? 0;
  const successRate =
    totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 0;

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/src/screens/LoginScreen" as any);
          return;
        }

        let d: any = null;
        try {
          const snap = await getDoc(doc(db, ADMIN_COLLECTION, user.uid));
          if (snap.exists()) d = snap.data();
        } catch (e) {
          console.warn("Admin doc fetch failed, using auth data:", e);
        }
        if (!active) return;

        setProfile({
          fullName: d?.fullName || d?.name || user.displayName || "",
          email: d?.email || user.email || "",
          mobileNumber: d?.mobileNumber || d?.phone || "",
          role: d?.role || "",
          createdAt: d?.createdAt ?? null,
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/src/screens/LoginScreen" as any);
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert(t.error, extra.logoutFailed);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>
          {t.loading}
        </Text>
      </View>
    );
  }

  const displayName = profile?.fullName || extra.adminProfile;
  const roleTitle = profile?.role
    ? /super/i.test(profile.role)
      ? extra.superAdmin
      : humanizeRole(profile.role)
    : extra.superAdmin;
  const roleShort = profile?.role ? humanizeRole(profile.role) : "Super Admin";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen title */}
        <Text style={[styles.screenTitle, { color: colors.subText }]}>
          {extra.adminProfile}
        </Text>

        {/* Header card */}
        <View style={[styles.headerCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.profileRole, { color: colors.subText }]}>
              {roleTitle}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard value={String(totalCases)} label={extra.casesHandled} />
          <StatCard value={String(resolvedCases)} label={extra.resolved} />
          <StatCard value={`${successRate}%`} label={extra.successRate} />
        </View>

        {/* Account */}
        <SectionHeader title={t.account} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="person-outline"
            label={t.profileInfo}
            subtitle={profile?.fullName || "—"}
            onPress={() => setShowProfileModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="mail-outline"
            label={t.email}
            subtitle={profile?.email || "—"}
            onPress={() => setShowProfileModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="call-outline"
            label={t.phone}
            subtitle={profile?.mobileNumber || "—"}
            onPress={() => setShowProfileModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="shield-outline"
            label={extra.rolesPerms}
            subtitle={roleShort}
            onPress={() => setShowProfileModal(true)}
          />
        </View>

        {/* Preferences */}
        <SectionHeader title={t.preferences} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="notifications-outline"
            label={t.notifications}
            subtitle={extra.enabled}
            onPress={() => Alert.alert(t.notifTitle, t.notifBody, [{ text: t.ok }])}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="settings-outline"
            label={t.systemSettings}
            onPress={() => setShowSettingsModal(true)}
          />
        </View>

        {/* Security */}
        <SectionHeader title={t.security} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="lock-closed-outline"
            label={t.changePassword}
            onPress={() => setShowPassModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="shield-checkmark-outline"
            label={t.twoFactor}
            subtitle={extra.enabled}
          />
        </View>

        {/* About */}
        <SectionHeader title={t.about} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <MenuRow
            icon="information-circle-outline"
            label={t.appVersion}
            subtitle="v2.4.1 (Build 245)"
            showChevron
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="document-text-outline"
            label={t.privacyPolicy}
            onPress={() => setShowPrivacyModal(true)}
          />
        </View>

        {/* Logout */}
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
              <Text style={styles.logoutText}>{t.logout}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.subText }]}>
            {extra.footerLine1}
          </Text>
          <Text style={[styles.footerText, { color: colors.subText }]}>
            {extra.footerLine2}
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <SystemSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <ProfileInfoModal
        visible={showProfileModal}
        profile={profile}
        roleTitle={roleTitle}
        onClose={() => setShowProfileModal(false)}
      />
      <ChangePasswordModal
        visible={showPassModal}
        onClose={() => setShowPassModal(false)}
      />
      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Logout confirmation */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconBox}>
              <Ionicons name="log-out-outline" size={28} color="#E53E3E" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.logoutConfirm}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.subText }]}>
              {t.logoutMessage}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.background }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDangerBtn} onPress={handleLogout}>
                <Text style={styles.modalPrimaryText}>{t.logout}</Text>
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
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },

  screenTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 12 },

  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1F5F6B",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: { fontSize: 18, fontWeight: "800" },
  profileRole: { fontSize: 12, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#E6F7F5", fontSize: 10, marginTop: 2, fontWeight: "500" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 10,
    marginLeft: 2,
  },

  card: {
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextBox: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "600" },
  menuSubtitle: { fontSize: 11, marginTop: 1 },
  divider: { height: 1, marginLeft: 60 },

  logoutBtn: {
    backgroundColor: "#E53E4E",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  footer: { alignItems: "center", gap: 2, marginBottom: 8 },
  footerText: { fontSize: 11 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBox: {
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
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  modalMessage: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { fontWeight: "700", fontSize: 14 },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: "#E53E3E",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalCloseBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Profile info
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 12,
    gap: 10,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 14, fontWeight: "600", marginTop: 1 },

  // Password fields
  passInputWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },

  // Settings modal
  settingsSection: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    alignSelf: "flex-start",
    marginTop: 14,
    marginBottom: 8,
  },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  optionPillActive: { backgroundColor: NAVY, borderColor: NAVY },
  optionPillText: { fontSize: 13, fontWeight: "600" },
  optionPillTextActive: { color: "#fff" },
  themeRow: { flexDirection: "row", gap: 8, width: "100%" },
  themeCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  themeCardActive: { backgroundColor: NAVY, borderColor: NAVY },
  themeCardText: { fontSize: 11, fontWeight: "700" },
  themeCardTextActive: { color: "#fff" },
  settingsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  settingsInfoText: { fontSize: 12 },
});