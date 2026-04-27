// LearnScreen.tsx
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Learn Screen (TypeScript)
// Firebase "learnContent" collection se sara data fetch karta hai
// Pehli launch par auto-seed bhi karta hai
// ─────────────────────────────────────────────────────────────
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import { seedAllData } from "../../seedFirebase";

// ── Collection name ───────────────────────────────────────────
const COLLECTION = "learnContent";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface Subsection {
  heading: string;
  body: string;
  icon: string;
  iconColor: string;
  bulletPoints: string[];
}

interface Tip {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  body: string;
}

interface TamperingSignItem {
  number: number;
  label: string;
  detail: string;
}

interface SuspiciousStepItem {
  icon: string;
  iconColor: string;
  text: string;
}

interface ElectricityTheftData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  order: number;
  learnMoreLabel?: string;
  learnMoreUrl?: string;
  subsections?: Subsection[];
}

interface EnergySavingData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  order: number;
  tips?: Tip[];
}

interface SafetyGuidelinesData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  order: number;
  viewGuideLabel?: string;
  viewGuideUrl?: string;
  helplineNumber?: string;
  communityMessage?: string;
  tamperingSigns?: TamperingSignItem[];
  suspiciousActivitySteps?: SuspiciousStepItem[];
}

type SectionData = ElectricityTheftData | EnergySavingData | SafetyGuidelinesData;

// ── Icon safety helper ────────────────────────────────────────
const ICON_MAP: Record<string, IoniconsName> = {
  shield: "shield",
  "shield-checkmark": "shield-checkmark",
  leaf: "leaf",
  bulb: "bulb",
  time: "time",
  speedometer: "speedometer",
  power: "power",
  "information-circle": "information-circle",
  warning: "warning",
  people: "people",
  flag: "flag",
  camera: "camera",
  "hand-left": "hand-left",
  call: "call",
  "checkmark-circle": "checkmark-circle",
  home: "home",
  "wifi-outline": "wifi-outline",
};

const safeIcon = (name: string, fallback: IoniconsName = "ellipse"): IoniconsName =>
  ICON_MAP[name] ?? fallback;

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

/** Electricity Theft — subsection card */
const SubsectionCard: React.FC<{ sub: Subsection }> = ({ sub }) => (
  <View style={styles.subsectionCard}>
    <View style={styles.subsectionHeader}>
      <Ionicons
        name={safeIcon(sub.icon, "information-circle")}
        size={17}
        color={sub.iconColor}
      />
      <Text style={[styles.subsectionHeading, { color: sub.iconColor }]}>
        {sub.heading}
      </Text>
    </View>
    {!!sub.body && <Text style={styles.subsectionBody}>{sub.body}</Text>}
    {sub.bulletPoints?.map((bp, i) => (
      <View key={i} style={styles.bulletRow}>
        <Ionicons name="remove" size={13} color="#E53E3E" style={{ marginTop: 3 }} />
        <Text style={styles.bulletText}>{bp}</Text>
      </View>
    ))}
  </View>
);

/** Energy Saving — tip card */
const TipCard: React.FC<{ tip: Tip }> = ({ tip }) => (
  <View style={styles.tipCard}>
    <View style={[styles.tipIconBox, { backgroundColor: tip.iconColor + "20" }]}>
      <Ionicons name={safeIcon(tip.icon, "flash")} size={21} color={tip.iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.tipTitle}>{tip.title}</Text>
      <Text style={styles.tipBody}>{tip.body}</Text>
    </View>
  </View>
);

/** Safety — numbered tampering sign */
const TamperingSign: React.FC<{ item: TamperingSignItem }> = ({ item }) => (
  <View style={styles.tamperRow}>
    <View style={styles.tamperBadge}>
      <Text style={styles.tamperBadgeText}>{item.number}</Text>
    </View>
    <Text style={styles.tamperText}>
      <Text style={styles.tamperLabel}>{item.label} </Text>
      {item.detail}
    </Text>
  </View>
);

/** Safety — suspicious activity step */
const SuspiciousStep: React.FC<{ step: SuspiciousStepItem }> = ({ step }) => (
  <View style={styles.stepRow}>
    <Ionicons
      name={safeIcon(step.icon, "checkmark-circle")}
      size={17}
      color={step.iconColor}
      style={{ marginTop: 2 }}
    />
    <Text style={styles.stepText}>{step.text}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────
// SECTION RENDERERS
// ─────────────────────────────────────────────────────────────

const ElectricityTheftSection: React.FC<{ data: ElectricityTheftData }> = ({ data }) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={[styles.iconCircle, { backgroundColor: data.color + "18" }]}>
        <Ionicons name={safeIcon(data.icon)} size={20} color={data.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.cardTitle}>{data.title}</Text>
        <Text style={styles.cardSubtitle}>{data.subtitle}</Text>
      </View>
    </View>

    {/* Subsections */}
    {data.subsections?.map((sub, i) => (
      <SubsectionCard key={i} sub={sub} />
    ))}

    {/* Learn More Button */}
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: data.color }]}
      onPress={() => data.learnMoreUrl && Linking.openURL(data.learnMoreUrl)}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnText}>{data.learnMoreLabel ?? "Learn More"}</Text>
    </TouchableOpacity>
  </View>
);

const EnergySavingSection: React.FC<{ data: EnergySavingData }> = ({ data }) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={[styles.iconCircle, { backgroundColor: data.color + "18" }]}>
        <Ionicons name={safeIcon(data.icon)} size={20} color={data.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.cardTitle}>{data.title}</Text>
        <Text style={styles.cardSubtitle}>{data.subtitle}</Text>
      </View>
    </View>

    {/* Tips */}
    {data.tips?.map((tip) => (
      <TipCard key={tip.id} tip={tip} />
    ))}
  </View>
);

const SafetyGuidelinesSection: React.FC<{ data: SafetyGuidelinesData }> = ({ data }) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={[styles.iconCircle, { backgroundColor: data.color + "18" }]}>
        <Ionicons name={safeIcon(data.icon)} size={20} color={data.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.cardTitle}>{data.title}</Text>
        <Text style={styles.cardSubtitle}>{data.subtitle}</Text>
      </View>
    </View>

    {/* Meter Tampering Signs */}
    <View style={styles.innerBox}>
      <Text style={styles.innerBoxTitle}>How to Identify Meter Tampering</Text>
      {data.tamperingSigns?.map((item, i) => (
        <TamperingSign key={i} item={item} />
      ))}
    </View>

    {/* Suspicious Activity */}
    <View style={styles.innerBox}>
      <Text style={styles.innerBoxTitle}>
        What to Do if Suspicious Activity is Detected
      </Text>
      {data.suspiciousActivitySteps?.map((step, i) => (
        <SuspiciousStep key={i} step={step} />
      ))}
      {!!data.helplineNumber && (
        <TouchableOpacity
          style={styles.helplineRow}
          onPress={() => Linking.openURL(`tel:${data.helplineNumber}`)}
        >
          <Ionicons name="call" size={13} color="#4299E1" />
          <Text style={styles.helplineText}>{data.helplineNumber}</Text>
        </TouchableOpacity>
      )}
    </View>

    {/* View Guide Button */}
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: data.color }]}
      onPress={() => data.viewGuideUrl && Linking.openURL(data.viewGuideUrl)}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnText}>
        {data.viewGuideLabel ?? "View Detailed Safety Guide"}
      </Text>
    </TouchableOpacity>

    {/* Community Banner */}
    {!!data.communityMessage && (
      <View style={styles.communityBanner}>
        <Ionicons name="home" size={19} color="#fff" style={{ marginBottom: 6 }} />
        <Text style={styles.communityTitle}>Together We Can Make a Difference</Text>
        <Text style={styles.communityBody}>{data.communityMessage}</Text>
      </View>
    )}
  </View>
);

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function LearnScreen(): React.ReactElement {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const q = query(collection(db, COLLECTION), orderBy("order"));
      const snapshot = await getDocs(q);

      // Agar 3 se kam documents hain toh seed/update karo
      if (snapshot.size < 3) {
        console.log(`Only ${snapshot.size} docs found — seeding missing data...`);
        const seeded = await seedAllData(true);
        if (seeded) {
          const snapshot2 = await getDocs(q);
          setSections(snapshot2.docs.map((d) => ({ id: d.id, ...d.data() } as SectionData)));
        }
      } else {
        setSections(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SectionData)));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Data load nahi ho saka. Internet connection check karein.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const onRefresh = (): void => {
    setRefreshing(true);
    fetchSections();
  };

  // Render correct component based on Firestore document ID
  const renderSection = (section: SectionData): React.ReactElement | null => {
    switch (section.id) {
      case "electricity_theft":
        return (
          <ElectricityTheftSection
            key={section.id}
            data={section as ElectricityTheftData}
          />
        );
      case "energy_saving":
        return (
          <EnergySavingSection
            key={section.id}
            data={section as EnergySavingData}
          />
        );
      case "safety_guidelines":
        return (
          <SafetyGuidelinesSection
            key={section.id}
            data={section as SafetyGuidelinesData}
          />
        );
      default:
        return null;
    }
  };

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={50} color="#CBD5E0" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchSections}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#E53E3E"]}
            tintColor="#E53E3E"
          />
        }
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Energy Awareness</Text>
          <Text style={styles.pageSubtitle}>
            Learn how to reduce electricity usage and prevent theft.
          </Text>
        </View>

        {/* Dynamic sections from Firebase learnContent */}
        {sections.map(renderSection)}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FC",
    gap: 14,
  },
  loadingText: { color: "#718096", fontSize: 14, marginTop: 8 },
  errorText: {
    color: "#718096",
    fontSize: 14,
    textAlign: "center",
    marginHorizontal: 30,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: "#E53E3E",
    paddingHorizontal: 32,
    paddingVertical: 11,
    borderRadius: 22,
    marginTop: 4,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Page header
  pageHeader: { marginTop: 50, marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: "#1A202C" },
  pageSubtitle: { fontSize: 13, color: "#718096", marginTop: 3 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1A202C" },
  cardSubtitle: { fontSize: 12, color: "#718096", marginTop: 2 },

  // Subsection (Electricity theft)
  subsectionCard: {
    backgroundColor: "#F7F8FC",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#E2E8F0",
  },
  subsectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  subsectionHeading: { fontSize: 13, fontWeight: "700", flex: 1 },
  subsectionBody: { fontSize: 12, color: "#4A5568", lineHeight: 18 },
  bulletRow: { flexDirection: "row", gap: 6, marginTop: 4, alignItems: "flex-start" },
  bulletText: { fontSize: 12, color: "#4A5568", flex: 1, lineHeight: 18 },

  // Primary button
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Tip cards (Energy saving)
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#F0FFF4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    alignItems: "flex-start",
  },
  tipIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tipTitle: { fontSize: 13, fontWeight: "700", color: "#1A202C", marginBottom: 3 },
  tipBody: { fontSize: 12, color: "#4A5568", lineHeight: 17 },

  // Inner box (Safety guidelines)
  innerBox: {
    backgroundColor: "#F7F8FC",
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  innerBoxTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 10,
  },

  // Tampering signs
  tamperRow: { flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" },
  tamperBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ED8936",
    justifyContent: "center",
    alignItems: "center",
  },
  tamperBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tamperText: { flex: 1, fontSize: 12, color: "#4A5568", lineHeight: 18 },
  tamperLabel: { fontWeight: "700", color: "#1A202C" },

  // Suspicious activity steps
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" },
  stepText: { flex: 1, fontSize: 12, color: "#4A5568", lineHeight: 18 },

  // Helpline
  helplineRow: { flexDirection: "row", gap: 5, alignItems: "center", marginTop: 6 },
  helplineText: { color: "#4299E1", fontSize: 12, fontWeight: "600" },

  // Community banner
  communityBanner: {
    backgroundColor: "#2B4C7E",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  communityTitle: { color: "#fff", fontWeight: "800", fontSize: 14, marginBottom: 6 },
  communityBody: { color: "#BEE3F8", fontSize: 12, lineHeight: 18 },
});