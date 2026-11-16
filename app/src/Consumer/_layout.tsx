import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMyNotifications } from "../../../hooks/useMyNotifications";

// Screens opened from inside a tab (results, chat, notifications, case details…).
// expo-router 58 treats `href: null` as an unreachable route and immediately
// redirects to the first tab, so these screens could never stay open. Keep them
// as normal routes and just render no tab-bar button for them.
const HIDDEN_TAB = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: "none" as const },
};

const Colors = {
  primary: "#0B3C5D",
  inactive: "#8E8E93",
  white: "#FFFFFF",
  border: "#E5E5EA",
  bar: "#FFFFFF",
  pill: "#E8F1FF",
};

export default function ConsumerLayout() {
  useMyNotifications();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inactive,
        tabBarStyle: {
          backgroundColor: Colors.bar,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ReportScreen"
        options={{
          title: "Report",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="LearnScreen"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? "bulb" : "bulb-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen name="DetectionResultScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="ChatbotScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="supportscreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="NotificationsScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="NotificationDetailScreen" options={HIDDEN_TAB} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: Colors.pill,
  },
});
