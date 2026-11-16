import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminOverlayProvider, useAdminOverlay } from "../../../components/AdminOverlay";
import { palette } from "../../../theme";
import { useNotifications } from "../../../hooks/useAdminApi";
import CreateCaseScreen from "./createCaseScreen";
import NotificationsScreen from "./notifications";

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

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={21} color={focused ? Colors.primary : Colors.inactive} />
    </View>
  );
}

export default function AdminLayout() {
  return (
    <AdminOverlayProvider>
      <AdminShell />
    </AdminOverlayProvider>
  );
}

function AdminShell() {
  useNotifications();
  const insets = useSafeAreaInsets();
  const overlayApi = useAdminOverlay();
  const overlay = overlayApi?.overlay ?? null;
  const tabBarHeight = 64 + insets.bottom;

  return (
    <View style={styles.shell}>
    <Tabs
      screenListeners={{
        tabPress: () => overlayApi?.close(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inactive,
        tabBarStyle: {
          backgroundColor: Colors.bar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
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
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "grid" : "grid-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="RisksScreen"
        options={{
          title: "Risks",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "warning" : "warning-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="CasesScreen"
        options={{
          title: "Cases",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "folder" : "folder-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ReportsScreen"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "bar-chart" : "bar-chart-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen name="CaseProfileScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="ConsumerProfileScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="createCaseScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="escalate" options={HIDDEN_TAB} />
      <Tabs.Screen name="notifications" options={HIDDEN_TAB} />
      <Tabs.Screen name="AlertsScreen" options={HIDDEN_TAB} />
      <Tabs.Screen name="EvidenceViewerScreen" options={HIDDEN_TAB} />
    </Tabs>
    {overlay?.kind === "create" && (
      <View style={[styles.sheet, { bottom: tabBarHeight }]}>
        <CreateCaseScreen
          key={`${overlay.consumerId ?? ""}-${overlay.consumerName ?? ""}`}
          embedded
          onClose={() => overlayApi?.close()}
          consumerId={overlay.consumerId}
          consumerName={overlay.consumerName}
        />
      </View>
    )}
    {overlay?.kind === "notifications" && (
      <View style={[styles.sheet, { bottom: tabBarHeight }]}>
        <NotificationsScreen onClose={() => overlayApi?.close()} />
      </View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.grey,
    zIndex: 30,
    elevation: 30,
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: Colors.pill },
  tabLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
});
