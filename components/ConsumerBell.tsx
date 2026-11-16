import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMyNotifications } from "../hooks/useMyNotifications";

export default function ConsumerBell() {
  const router = useRouter();
  const { unread } = useMyNotifications();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push("/src/Consumer/NotificationsScreen" as any)}
      activeOpacity={0.8}
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={20} color="#0B3C5D" />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
});
