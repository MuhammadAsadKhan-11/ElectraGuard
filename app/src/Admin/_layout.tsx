// app/src/Admin/_layout.tsx
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Colors = {
  primary: "#0B3C5D",
  textSecondary: "#8E8E93",
  white: "#FFFFFF",
  border: "#E5E5EA",
};

// Only these routes are ever shown in the tab bar (order = display order)
const VISIBLE_TABS = [
  "index",
  "RisksScreen",
  "CasesScreen",
  "ReportsScreen",
  "ProfileScreen",
];

const TAB_ICONS = {
  dashboard: require("../../../assets/House.png"),
  risks: require("../../../assets/Warning.png"),
  cases: require("../../../assets/FileText.png"),
  reports: require("../../../assets/ChartBar.png"),
  profile: require("../../../assets/User.png"),
};

function TabIcon({
  image,
  label,
  focused,
}: {
  image: any;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabIconWrap}>
      <Image
        source={image}
        style={[
          styles.tabImage,
          { tintColor: focused ? Colors.primary : Colors.textSecondary },
        ]}
        resizeMode="contain"
      />
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

// Custom tab bar: renders ONLY the 5 routes above, so any other file inside
// the Admin folder can never show up as an extra tab.
function AdminTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeKey = state.routes[state.index]?.key;

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {VISIBLE_TABS.map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;

        const { options } = descriptors[route.key];
        const focused = activeKey === route.key;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tabItem}
          >
            {options.tabBarIcon?.({
              focused,
              color: focused ? Colors.primary : Colors.textSecondary,
              size: 24,
            })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* ✅ The 5 visible tabs */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={TAB_ICONS.dashboard} label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="RisksScreen"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={TAB_ICONS.risks} label="Risks" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="CasesScreen"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={TAB_ICONS.cases} label="Cases" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ReportsScreen"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={TAB_ICONS.reports} label="Reports" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ProfileScreen"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={TAB_ICONS.profile} label="Profile" focused={focused} />
          ),
        }}
      />

      {/* 🚫 Hidden screens (still navigable via router.push, no tab shown) */}
      <Tabs.Screen name="CaseProfileScreen" options={{ href: null }} />
      <Tabs.Screen name="ConsumerProfileScreen" options={{ href: null }} />
      <Tabs.Screen name="createCaseScreen" options={{ href: null }} />
      <Tabs.Screen name="escalate" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 70,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabImage: { width: 24, height: 24 },
  tabLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    width: 70,
  },
  tabLabelActive: { color: Colors.primary, fontWeight: "700" },
});