import { Tabs } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

const Colors = {
  primary: '#0B3C5D',
  textSecondary: '#8E8E93',
  white: '#FFFFFF',
  border: '#E5E5EA',
};

// ── Replace these with your actual image assets ──────────────────────────────
const TAB_ICONS = {
  dashboard:  require('../../assets/Group 35.png'), // Replace: your dashboard icon
  risks:      require('../../assets/Group 36.png'), // Replace: your risks icon
  cases:      require('../../assets/Group 37.png'), // Replace: your cases icon
  reports:    require('../../assets/Group 38.png'), // Replace: your reports icon
  profile:    require('../../assets/Group 39.png'), // Replace: your profile icon
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
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
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

      {/* Hidden screens - not in tab bar */}
      <Tabs.Screen name="notifications"          options={{ href: null }} />
      <Tabs.Screen name="CaseProfileScreen"      options={{ href: null }} />
      <Tabs.Screen name="ConsumerProfileScreen"  options={{ href: null }} />
      <Tabs.Screen name="DashboardScreen"        options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 70,
    paddingBottom: 8,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    gap: 3,
  },
  tabImage: {
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});