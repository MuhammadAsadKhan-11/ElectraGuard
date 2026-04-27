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

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Gemini Setup ─────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI("AIzaSyBNcsJASf3NgFK3g6_Z0L1a8ky-OWv1hIE");

// ✅ gemini-2.0-flash — works with latest @google/generative-ai SDK
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});

// ✅ Use startChat + sendMessage instead of generateContent
const getGeminiResponse = async (message: string): Promise<string> => {
  try {
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });
    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I couldn't process your request right now.";
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  text: string;
  sender: "bot" | "user";
  time: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const BotAvatar = () => (
  <View style={styles.avatarCircle}>
    <Text style={styles.avatarText}>⚡</Text>
  </View>
);

const MessageBubble = ({ item }: { item: Message }) => {
  const isUser = item.sender === "user";

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
      {!isUser && <BotAvatar />}
      <View style={styles.bubbleWrapper}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.timeText, isUser ? styles.timeTextUser : styles.timeTextBot]}>
          {item.time}
        </Text>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

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

    // User message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
      time: getTime(),
    };

    // Loading placeholder
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = {
      id: loadingId,
      text: "Typing...",
      sender: "bot",
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInputText("");

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Gemini response
    const botText = await getGeminiResponse(trimmed);

    const botMsg: Message = {
      id: loadingId,
      text: botText,
      sender: "bot",
      time: getTime(),
    };

    setMessages((prev) => prev.map((msg) => (msg.id === loadingId ? botMsg : msg)));
    setIsSending(false);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
            multiline
            editable={!isSending}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const NAVY        = "#0d2137";
const TEAL        = "#1a8c7a";
const USER_BUBBLE = "#1a3a52";
const WHITE       = "#ffffff";
const LIGHT_BG    = "#f0f4f8";
const BORDER      = "#dce3eb";

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

  headerCenter: { flexDirection: "row", alignItems: "center" },

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
  headerTitle:      { color: WHITE, fontSize: 16, fontWeight: "700" },
  headerSubtitle:   { color: "#7fa8c4", fontSize: 11 },

  listContent: { padding: 14 },

  messageRow:     { flexDirection: "row", marginBottom: 10, alignItems: "flex-end" },
  messageRowBot:  { justifyContent: "flex-start" },
  messageRowUser: { justifyContent: "flex-end" },

  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  avatarText:    { fontSize: 16 },
  bubbleWrapper: { maxWidth: "75%" },

  bubble:     { borderRadius: 16, padding: 12 },
  bubbleBot:  { backgroundColor: WHITE },
  bubbleUser: { backgroundColor: USER_BUBBLE },

  bubbleText:     { fontSize: 14 },
  bubbleTextBot:  { color: "#1c2d3d" },
  bubbleTextUser: { color: WHITE },

  timeText:     { fontSize: 10, marginTop: 4, color: "#8fa4b5" },
  timeTextBot:  { textAlign: "left" },
  timeTextUser: { textAlign: "right" },

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

  sendBtnDisabled: { backgroundColor: "#b0bec5" },
  sendIcon:        { color: WHITE, fontSize: 16 },
});