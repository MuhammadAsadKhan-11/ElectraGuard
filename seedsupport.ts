// seedSupport.ts
// ─────────────────────────────────────────────────────────────
// ElectraGuard — Support Screen ka seed data
// Collection: "supportContent"
// ─────────────────────────────────────────────────────────────
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const COLLECTION = "supportContent";

export async function seedSupportData(forceUpdate = false): Promise<boolean> {
  try {
    if (!forceUpdate) {
      const check = await getDoc(doc(db, COLLECTION, "faqs"));
      if (check.exists()) {
        console.log("✅ supportContent already exists — skipping seed.");
        return true;
      }
    }

    // ── 1. FAQs ──────────────────────────────────────────────
    await setDoc(doc(db, COLLECTION, "faqs"), {
      order: 1,
      items: [
        {
          id: "faq1",
          icon: "warning-outline",
          question: "What is electricity theft?",
          answer:
            "Electricity theft is the unauthorized use of electrical power by tampering with meters, making illegal connections, or bypassing the billing system. It is a criminal offence under the Pakistan Electricity Act 1910 and PECO Act 1997.",
        },
        {
          id: "faq2",
          icon: "document-text-outline",
          question: "What are the legal consequences?",
          answer:
            "Under Section 39 of the Electricity Act 1910, electricity theft is punishable by imprisonment of up to 3 years, a fine up to PKR 500,000, or both. Repeat offenders may face stricter penalties under NEPRA regulations.",
        },
        {
          id: "faq3",
          icon: "flash-outline",
          question: "How can I reduce my electricity bill?",
          answer:
            "Use energy-efficient LED bulbs, switch off appliances when not in use, avoid peak-hour (6–10 PM) usage, maintain your AC at 26°C, use star-rated appliances, and submit your meter reading on time each month.",
        },
        {
          id: "faq4",
          icon: "calculator-outline",
          question: "How is my bill calculated?",
          answer:
            "Your bill = Units consumed × applicable slab rate (set by NEPRA). Additional charges include fuel adjustment, taxes (GST 18%), meter rent, and fixed charges. You can verify your bill at IESCO/WAPDA official portal.",
        },
        {
          id: "faq5",
          icon: "notifications-outline",
          question: "Why did I receive an unusual usage alert?",
          answer:
            "ElectraGuard's AI compares your current consumption against your historical average. If usage deviates significantly (>30%), you receive a risk alert. This could indicate meter tampering, appliance malfunction, or unauthorized use.",
        },
        {
          id: "faq6",
          icon: "shield-outline",
          question: "How do I report meter tampering?",
          answer:
            "Use the 'Report Issue' feature in ElectraGuard app, or call WAPDA helpline 118. Take clear photos as evidence before reporting. You can also visit your nearest DISCO (distribution company) office.",
        },
      ],
    });

    // ── 2. Knowledge Base Articles ───────────────────────────
    await setDoc(doc(db, COLLECTION, "knowledge_base"), {
      order: 2,
      articles: [
        {
          id: "kb1",
          label: "Pakistan Electricity Act 1910 — Full Text",
          url: "https://nepra.org.pk/licensing/Licenses/Distribution%20Licences/IESCO/Electricity%20Act%201910.pdf",
          category: "Legal",
          icon: "document-text-outline",
        },
        {
          id: "kb2",
          label: "NEPRA — Consumer Rights & Obligations",
          url: "https://nepra.org.pk/Regulation/Regulations.aspx",
          category: "Regulation",
          icon: "shield-checkmark-outline",
        },
        {
          id: "kb3",
          label: "WAPDA — Electricity Theft Awareness Guide",
          url: "https://wapda.gov.pk/",
          category: "Awareness",
          icon: "book-outline",
        },
        {
          id: "kb4",
          label: "IESCO — Electricity Safety Tips",
          url: "https://iesco.com.pk/",
          category: "Safety",
          icon: "flash-outline",
        },
        {
          id: "kb5",
          label: "Govt of Pakistan — Energy Conservation Policy",
          url: "https://www.moepd.gov.pk/",
          category: "Policy",
          icon: "leaf-outline",
        },
        {
          id: "kb6",
          label: "NEPRA — Electricity Tariff Schedule 2024",
          url: "https://nepra.org.pk/tariff/Tariffs.aspx",
          category: "Tariff",
          icon: "calculator-outline",
        },
      ],
    });

    // ── 3. Contact Info ──────────────────────────────────────
    await setDoc(doc(db, COLLECTION, "contact_info"), {
      order: 3,
      helplineNumber: "118",
      helplineLabel: "WAPDA Helpline",
      helplineSubLabel: "24/7 Expert Support",
      liveChatLabel: "Live Chat",
      liveChatSubLabel: "Chat with support team",
      liveChatStatus: "Online 24/7",
      knowledgeBaseLabel: "Knowledge Base",
      knowledgeBaseSubLabel: "Browse articles",
      knowledgeBaseCount: "60+ articles",
    });

    console.log("✅ supportContent seeded successfully!");
    return true;
  } catch (error) {
    console.error("❌ seedSupportData error:", error);
    return false;
  }
}