import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ─────────────────────────────────────────────────────────────
   RENDER BACKEND URL
───────────────────────────────────────────────────────────── */
const API_URL = "https://electraguard-backend-1.onrender.com/chat";

// Render free tier can take 30-60s to wake up, so allow a long timeout
const REQUEST_TIMEOUT_MS = 90_000;
// After this long, tell the user the server is waking up
const SLOW_NOTICE_MS = 8_000;

/* ─────────────────────────────────────────────────────────────
   Backend Chat Function
───────────────────────────────────────────────────────────── */
type BotResult = { text: string; sources: string[] };

// Gemini often answers with Markdown (**bold**, "* " bullets, "# " headings).
// <Text> shows them as raw symbols, so tidy them up.
const cleanReply = (t: string): string =>
  t
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .replace(/^#{1,6}\s*/gm, "")
    .trim();

// "lesco_home" -> "LESCO", "ke_faqs" -> "KE", "nepra_home" -> "NEPRA"
const sourceLabel = (s: string): string => s.split("_")[0].toUpperCase();

const getGeminiResponse = async (
  message: string,
  onSlow?: () => void
): Promise<BotResult> => {
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const slowTimer = setTimeout(() => onSlow?.(), SLOW_NOTICE_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal as any, // RN vs DOM AbortSignal type mismatch
    });

    // Read as text first, then parse, so an HTML error page can't crash JSON.parse
    const text = await response.text();

    if (text.startsWith("<")) {
      console.log("Backend returned HTML - server might be down or wrong URL");
      return {
        text: "Server is currently unavailable. Please try again later.",
        sources: [],
      };
    }

    let data: { reply?: string; sources?: string[]; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      console.log("Invalid JSON received:", text);
      return { text: "Received invalid response from server.", sources: [] };
    }

    // Backend errors look like { "error": "..." } (400, 429, 500)
    if (!response.ok) {
      return {
        text: data.error ?? "Server error. Please try again.",
        sources: [],
      };
    }

    return {
      text: cleanReply(data.reply ?? "No response received."),
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return {
        text: "The server took too long to respond. Please try again.",
        sources: [],
      };
    }
    console.log("Backend Error:", error);
    return { text: "Unable to connect right now.", sources: [] };
  } finally {
    clearTimeout(timeoutTimer);
    clearTimeout(slowTimer);
  }
};

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type Message = {
  id: string;
  text: string;
  sender: "bot" | "user";
  time: string;
  sources?: string[];
};

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const getTime = (): string => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m}${ampm}`;
};

const BOT_GREETING: Message = {
  id: "1",
  text: "Hello! I'm here to help you with any questions about your electricity consumption, billing, or the Electra Guard system. How can I assist you today?",
  sender: "bot",
  time: getTime(),
};

/* ─────────────────────────────────────────────────────────────
   Components
───────────────────────────────────────────────────────────── */
const BotAvatar = () => (
  <View style={styles.avatarCircle}>
    <Text style={styles.avatarText}>⚡</Text>
  </View>
);

const MessageBubble = ({ item }: { item: Message }) => {
  const isUser = item.sender === "user";
  const sources = item.sources ? Array.from(new Set(item.sources.map(sourceLabel))) : [];

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowBot,
      ]}
    >
      {!isUser && <BotAvatar />}

      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleBot,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextBot,
            ]}
          >
            {item.text}
          </Text>

          {!isUser && sources.length > 0 && (
            <Text style={styles.sourcesText}>Sources: {sources.join(", ")}</Text>
          )}
        </View>

        <Text
          style={[
            styles.timeText,
            isUser ? styles.timeTextUser : styles.timeTextBot,
          ]}
        >
          {item.time}
        </Text>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main Screen
───────────────────────────────────────────────────────────── */
export default function SupportChatScreen() {
  const navigation = useNavigation();

  const [messages, setMessages] = useState<Message[]>([BOT_GREETING]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
      time: getTime(),
    };

    const loadingId = (Date.now() + 1).toString();

    const loadingMsg: Message = {
      id: loadingId,
      text: "Typing...",
      sender: "bot",
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInputText("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // If the server is slow (Render waking up), update the typing bubble
    const onSlow = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, text: "Waking up the server, this can take up to a minute..." }
            : msg
        )
      );
    };

    const result = await getGeminiResponse(trimmed, onSlow);

    const botMsg: Message = {
      id: loadingId,
      text: result.text,
      sender: "bot",
      time: getTime(),
      sources: result.sources,
    };

    setMessages((prev) =>
      prev.map((msg) => (msg.id === loadingId ? botMsg : msg))
    );

    setIsSending(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarCircle}>
            <Text style={styles.headerAvatarText}>⚡</Text>
          </View>

          <View>
            <Text style={styles.headerTitle}>Support Assistant</Text>
            <Text style={styles.headerSubtitle}>Powered by AI</Text>
          </View>
        </View>
      </View>

      {/* Chat */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble item={item} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#aab4be"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            maxLength={2000} // backend rejects messages longer than 2000 characters
            multiline
            editable={!isSending}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isSending}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────── */
const NAVY = "#0d2137";
const TEAL = "#1a8c7a";
const USER_BUBBLE = "#1a3a52";
const WHITE = "#ffffff";
const LIGHT_BG = "#f0f4f8";
const BORDER = "#dce3eb";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  flex: { flex: 1, backgroundColor: LIGHT_BG },

  header: {
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  backBtn: { marginRight: 12 },

  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  headerAvatarText: { fontSize: 18 },
  headerTitle: { color: WHITE, fontSize: 16, fontWeight: "700" },
  headerSubtitle: { color: "#7fa8c4", fontSize: 11 },

  listContent: { padding: 14 },

  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-end",
  },

  messageRowBot: {
    justifyContent: "flex-start",
  },

  messageRowUser: {
    justifyContent: "flex-end",
  },

  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText: { fontSize: 16 },

  bubbleWrapper: {
    maxWidth: "75%",
  },

  bubble: {
    borderRadius: 16,
    padding: 12,
  },

  bubbleBot: {
    backgroundColor: WHITE,
  },

  bubbleUser: {
    backgroundColor: USER_BUBBLE,
  },

  bubbleText: {
    fontSize: 14,
  },

  bubbleTextBot: {
    color: "#1c2d3d",
  },

  bubbleTextUser: {
    color: WHITE,
  },

  sourcesText: {
    marginTop: 8,
    fontSize: 11,
    color: TEAL,
    fontWeight: "600",
  },

  timeText: {
    fontSize: 10,
    marginTop: 4,
    color: "#8fa4b5",
  },

  timeTextBot: {
    textAlign: "left",
  },

  timeTextUser: {
    textAlign: "right",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 10,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#1c2d3d",
  },

  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  sendBtnDisabled: {
    backgroundColor: "#b0bec5",
  },

  sendIcon: {
    color: WHITE,
    fontSize: 16,
  },
});