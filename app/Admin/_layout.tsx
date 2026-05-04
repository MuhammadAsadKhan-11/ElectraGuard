import { Tabs } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

const Colors = {
  primary: '#0B3C5D',
  textSecondary: '#8E8E93',
  white: '#FFFFFF',
  border: '#E5E5EA',
};

const TAB_ICONS = {
  dashboard: require('../../assets/House.png'),
  risks:     require('../../assets/Warning.png'),
  cases:     require('../../assets/FileText.png'),
  reports:   require('../../assets/ChartBar.png'),
  profile:   require('../../assets/User.png'),
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

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarIconStyle: styles.tabBarIconStyle, // ← yeh add karo
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

      <Tabs.Screen name="notifications"         options={{ href: null }} />
      <Tabs.Screen name="CaseProfileScreen"     options={{ href: null }} />
      <Tabs.Screen name="ConsumerProfileScreen" options={{ href: null }} />
      <Tabs.Screen name="DashboardScreen"       options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 70,
    paddingBottom: 0,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBarIconStyle: {
    height: 60,       // tab bar ki full height use karo
    marginTop: 0,
  },
  tabIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',  // icon + label ko vertically center karo
    gap: 4,
  },
  tabImage: {
    width: 24,
    height: 24,       // fixed height, marginTop hata diya
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    width: 65,        // "Dashboard" k liye enough width
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});