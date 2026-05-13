// ── Support content lives in /supportContent collection ───────────────────────
// Three documents: "faqs", "knowledge_base", "contact_info"
// Written by seedSupportData(), read by SupportScreen

// ── /supportContent/faqs → { items: FAQItem[] } ───────────────────────────────
export interface FAQItem {
  id:       string;
  icon:     string;        // Ionicons name
  question: string;
  answer:   string;
}

// ── /supportContent/knowledge_base → { articles: KBArticle[] } ───────────────
export interface KBArticle {
  id:       string;
  label:    string;
  url:      string;
  category: string;
  icon:     string;        // Ionicons name
}

// ── /supportContent/contact_info → ContactInfo ────────────────────────────────
export interface ContactInfo {
  helplineNumber:      string;
  helplineLabel:       string;
  helplineSubLabel:    string;
  liveChatLabel:       string;
  liveChatSubLabel:    string;
  liveChatStatus:      string;
  knowledgeBaseLabel:    string;
  knowledgeBaseSubLabel: string;
  knowledgeBaseCount:    string;
}

// ── Combined state type used inside SupportScreen ────────────────────────────
export interface SupportData {
  faqs:     FAQItem[];
  articles: KBArticle[];
  contact:  ContactInfo | null;
}

// ❌ REMOVED — SupportTicket doesn't exist anywhere in your codebase:
// ticketId, userId, subject, message, status, updatedAt
// Your app has no ticket submission form — only a WhatsApp/call redirect