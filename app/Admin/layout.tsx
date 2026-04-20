import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0B3C5D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="AdminDashBoard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AdminriskScreen"
        options={{
          title: 'Risks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AdminalertScreen"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AdminReportScreen"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AdminProfileScreen"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}