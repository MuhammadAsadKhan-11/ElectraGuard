import { useNavigation } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SupportChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([BOT_GREETING]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
      time: getTime(),
    };

    const botReply: Message = {
      id: (Date.now() + 1).toString(),
      text: "Hello! I'm here to help you with any questions about your electricity consumption, billing, or the Electra Guard system. How can I assist you today?",
      sender: "bot",
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg, botReply]);
    setInputText("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0d2137" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back to support screen"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
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

      {/* ── Message List ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type your Message..."
            placeholderTextColor="#aab4be"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            accessibilityLabel="Send message"
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const NAVY = "#0d2137";
const NAVY_LIGHT = "#163451";
const TEAL = "#1a8c7a";
const USER_BUBBLE = "#1a3a52";
const WHITE = "#ffffff";
const LIGHT_BG = "#f0f4f8";
const BORDER = "#dce3eb";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: NAVY,
  },
  flex: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // ── Header
  header: {
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 20 : 14,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  backArrow: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "600",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  headerAvatarText: {
    fontSize: 18,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: "#7fa8c4",
    fontSize: 11,
    marginTop: 1,
    fontStyle: "italic",
  },

  // ── List
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    gap: 14,
  },

  // ── Message rows
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  messageRowBot: {
    justifyContent: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },

  // ── Avatar
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 18,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
  },

  // ── Bubble wrapper
  bubbleWrapper: {
    maxWidth: "75%",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: USER_BUBBLE,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextBot: {
    color: "#1c2d3d",
  },
  bubbleTextUser: {
    color: WHITE,
  },

  // ── Time
  timeText: {
    fontSize: 10,
    marginTop: 4,
    color: "#8fa4b5",
  },
  timeTextBot: {
    textAlign: "left",
    marginLeft: 4,
  },
  timeTextUser: {
    textAlign: "right",
    marginRight: 4,
  },

  // ── Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1c2d3d",
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#b0bec5",
  },
  sendIcon: {
    color: WHITE,
    fontSize: 16,
    marginLeft: 2,
  },
});