// SupportScreen.tsx
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Support Screen (TypeScript)
// Fetches data from Firebase "supportContent" collection
// ─────────────────────────────────────────────────────────────
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { seedSupportData } from "../../seedsupport";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface FAQItem {
  id: string;
  icon: string;
  question: string;
  answer: string;
}

interface KBArticle {
  id: string;
  label: string;
  url: string;
  category: string;
  icon: string;
}

interface ContactInfo {
  helplineNumber: string;
  helplineLabel: string;
  helplineSubLabel: string;
  liveChatLabel: string;
  liveChatSubLabel: string;
  liveChatStatus: string;
  knowledgeBaseLabel: string;
  knowledgeBaseSubLabel: string;
  knowledgeBaseCount: string;
}

interface SupportData {
  faqs: FAQItem[];
  articles: KBArticle[];
  contact: ContactInfo | null;
}

// ─────────────────────────────────────────────────────────────
// FAQ ITEM COMPONENT
// ─────────────────────────────────────────────────────────────
const FAQAccordion: React.FC<{ item: FAQItem }> = ({ item }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <View style={styles.faqLeft}>
          <Ionicons
            name={(item.icon as IoniconsName) || "help-circle-outline"}
            size={16}
            color="#0B3C5D"
            style={{ marginTop: 1 }}
          />
          <Text style={styles.faqQuestion}>{item.question}</Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// KNOWLEDGE BASE ARTICLE CARD
// ─────────────────────────────────────────────────────────────
const ArticleCard: React.FC<{ article: KBArticle }> = ({ article }) => (
  <TouchableOpacity
    style={styles.articleCard}
    onPress={() => Linking.openURL(article.url)}
    activeOpacity={0.75}
  >
    <View style={styles.articleIconBox}>
      <Ionicons
        name={(article.icon as IoniconsName) || "document-outline"}
        size={18}
        color="#0B3C5D"
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.articleLabel}>{article.label}</Text>
      <Text style={styles.articleCategory}>{article.category}</Text>
    </View>
    <Ionicons name="open-outline" size={15} color="#9CA3AF" />
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────
// WHATSAPP HELPER
// ─────────────────────────────────────────────────────────────
const openWhatsApp = async (phoneNumber: string) => {
  const cleaned = phoneNumber.replace(/^0/, "");
  const fullNumber = cleaned.startsWith("92") ? cleaned : `92${cleaned}`;
  const message = encodeURIComponent("Hello! I need support.");

  const whatsappNative = `whatsapp://send?phone=${fullNumber}&text=${message}`;
  const whatsappWeb = `https://wa.me/${fullNumber}?text=${message}`;

  const canOpen = await Linking.canOpenURL(whatsappNative);
  if (canOpen) {
    Linking.openURL(whatsappNative);
  } else {
    Linking.openURL(whatsappWeb);
  }
};

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function SupportScreen(): React.ReactElement {
  const [data, setData] = useState<SupportData>({
    faqs: [],
    articles: [],
    contact: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKB, setShowKB] = useState(false);

  // ── Fetch from Firebase ──────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const q = query(
        collection(db, "supportContent"),
        orderBy("order")
      );
      const snapshot = await getDocs(q);

      if (snapshot.size < 3) {
        console.log("Seeding supportContent...");
        await seedSupportData(true);
        const snapshot2 = await getDocs(q);
        parseSnapshot(snapshot2);
      } else {
        parseSnapshot(snapshot);
      }
    } catch (err) {
      console.error("Support fetch error:", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const parseSnapshot = (snapshot: any) => {
    let faqs: FAQItem[] = [];
    let articles: KBArticle[] = [];
    let contact: ContactInfo | null = null;

    snapshot.docs.forEach((d: any) => {
      const docData = d.data();
      if (d.id === "faqs") faqs = docData.items || [];
      if (d.id === "knowledge_base") articles = docData.articles || [];
      if (d.id === "contact_info") contact = docData as ContactInfo;
    });

    setData({ faqs, articles, contact });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0B3C5D" />
        <Text style={styles.loadingText}>Loading support...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={48} color="#D1D5DB" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { faqs, articles, contact } = data;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0B3C5D"
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#0B3C5D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>
            Get answers to your questions and learn about energy conservation
          </Text>
        </View>

        {/* ── Contact Options ── */}
        <View style={styles.contactRow}>
          {/* ── Live Chat → redirects to WhatsApp ── */}
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() =>
              openWhatsApp(contact?.helplineNumber || "03258568691")
            }
            activeOpacity={0.8}
          >
            <View style={[styles.contactIconBox, { backgroundColor: "#E7F7EC" }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={styles.contactLabel}>
              {contact?.liveChatLabel || "Live Chat"}
            </Text>
            <Text style={styles.contactSub}>
              {contact?.liveChatSubLabel || "Chat on WhatsApp"}
            </Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineBadgeText}>
                {contact?.liveChatStatus || "Online 24/7"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Helpline */}
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() =>
              Linking.openURL(`tel:${contact?.helplineNumber || "03258568691"}`)
            }
            activeOpacity={0.8}
          >
            <View style={[styles.contactIconBox, { backgroundColor: "#F0FFF4" }]}>
              <Ionicons name="help-circle-outline" size={22} color="#16A34A" />
            </View>
            <Text style={styles.contactLabel}>
              {contact?.helplineLabel || "Helpline"}
            </Text>
            <Text style={styles.contactSub}>
              {contact?.helplineSubLabel || "24/7 Expert Support"}
            </Text>
            <Text style={styles.helplineNumber}>
              {contact?.helplineNumber || "03258568691"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Knowledge Base ── */}
        <TouchableOpacity
          style={styles.kbCard}
          onPress={() => setShowKB(!showKB)}
          activeOpacity={0.8}
        >
          <View style={styles.kbLeft}>
            <View style={[styles.contactIconBox, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="library-outline" size={22} color="#D97706" />
            </View>
            <View>
              <Text style={styles.contactLabel}>
                {contact?.knowledgeBaseLabel || "Knowledge Base"}
              </Text>
              <Text style={styles.contactSub}>
                {contact?.knowledgeBaseSubLabel || "Browse articles"}
              </Text>
              <Text style={styles.kbCount}>
                {contact?.knowledgeBaseCount || "60+ articles"}
              </Text>
            </View>
          </View>
          <Ionicons
            name={showKB ? "chevron-up" : "chevron-down"}
            size={18}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {/* ── KB Articles (expandable) ── */}
        {showKB && articles.length > 0 && (
          <View style={styles.articlesContainer}>
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </View>
        )}

        {/* ── FAQs ── */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqContainer}>
          {faqs.map((item) => (
            <FAQAccordion key={item.id} item={item} />
          ))}
        </View>

        {/* ── Chat FAB hint ── */}
        <TouchableOpacity
          style={styles.chatBotHint}
          onPress={() => router.push("/Consumer/ChatbotScreen" as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.chatBotHintText}>Ask AI Assistant</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    gap: 12,
  },
  loadingText: { color: "#718096", fontSize: 14 },
  errorText: { color: "#718096", fontSize: 14, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#0B3C5D",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  // Header
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 40,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backRow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0B3C5D", marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: "#6B7280", lineHeight: 19 },

  // Contact options
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  contactCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contactIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  contactLabel: { fontSize: 13, fontWeight: "700", color: "#1A202C", marginBottom: 2 },
  contactSub: { fontSize: 11, color: "#9CA3AF", marginBottom: 6 },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FFF4",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  onlineBadgeText: { fontSize: 10, color: "#16A34A", fontWeight: "600" },
  helplineNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#16A34A",
    marginTop: 2,
  },

  // Knowledge Base
  kbCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kbLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  kbCount: { fontSize: 11, color: "#D97706", fontWeight: "600", marginTop: 2 },

  // Articles
  articlesContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  articleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  articleLabel: { fontSize: 13, fontWeight: "600", color: "#1A202C", marginBottom: 2 },
  articleCategory: {
    fontSize: 11,
    color: "#9CA3AF",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A202C",
    marginBottom: 10,
    marginLeft: 2,
  },

  // FAQ
  faqContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  faqLeft: { flexDirection: "row", gap: 10, flex: 1, alignItems: "flex-start" },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1A202C",
    lineHeight: 19,
  },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    backgroundColor: "#F8FAFC",
  },
  faqAnswerText: {
    fontSize: 12,
    color: "#4A5568",
    lineHeight: 19,
  },

  // Chat hint
  chatBotHint: {
    backgroundColor: "#0B3C5D",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: "#0B3C5D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBotHintText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});