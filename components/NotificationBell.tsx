// components/NotificationBell.tsx
// Bell icon + live unread badge. Kisi bhi admin screen ke header mai bas <NotificationBell /> laga do.
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { palette } from "../constants/adminUi";
import { useNotifications } from "../hooks/useAdminApi";

export default function NotificationBell({
  size = 28,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { unread, loaded } = useNotifications();

  const shake = useRef(new Animated.Value(0)).current;
  const prevUnread = useRef<number | null>(null);

  // Naya notification aate hi bell hil-ta hai (pehli load par nahi)
  useEffect(() => {
    if (!loaded) return;
    if (prevUnread.current !== null && unread > prevUnread.current) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    }
    prevUnread.current = unread;
  }, [unread, loaded, shake]);

  const rotate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-18deg", "18deg"],
  });

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={() => router.push("/src/Admin/notifications" as any)}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
    >
      <Animated.Image
        source={require("../assets/Bell.png")}
        style={{ width: size, height: size, transform: [{ rotate }] }}
        resizeMode="contain"
      />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: palette.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
