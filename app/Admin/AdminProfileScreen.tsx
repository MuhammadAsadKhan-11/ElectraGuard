import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

interface AdminProfile {
  fullName: string;
  email: string;
  adminId: string;
  department?: string;
  role: string;
  lastLoginAt?: string;
}

export default function AdminProfileScreen() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'admins'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) setProfile(snap.docs[0].data() as AdminProfile);
    } catch (e) {}
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          router.replace('/screens/LoginScreen' as any);
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: 'people-outline',
      label: 'Manage Consumers',
      onPress: () => router.push('/Admin/AdminriskScreen' as any),
    },
    {
      icon: 'key-outline',
      label: 'Change Password',
      onPress: () => router.push('/screens/ForgotPasswordScreen' as any),
    },
    {
      icon: 'document-text-outline',
      label: 'Reports',
      onPress: () => router.push('/Admin/AdminReportScreen' as any),
    },
    {
      icon: 'notifications-outline',
      label: 'Alerts',
      onPress: () => router.push('/Admin/AdminalertScreen' as any),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />

      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {profile?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'AD'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.fullName || 'Admin User'}</Text>
        <Text style={styles.email}>{profile?.email || auth.currentUser?.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
          <Text style={styles.roleText}>{profile?.department || 'System Administrator'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Admin ID</Text>
            <Text style={styles.infoValue}>{profile?.adminId || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{profile?.role || 'Admin'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Login</Text>
            <Text style={styles.infoValue}>
              {profile?.lastLoginAt
                ? new Date(profile.lastLoginAt).toLocaleDateString('en-PK')
                : 'Today'}
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name={item.icon as any} size={20} color="#0B3C5D" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {idx < menuItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#0B3C5D', paddingTop: 50, paddingBottom: 30,
    alignItems: 'center', paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#FFFFFF' },
  name: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#FFFFFF', marginBottom: 4 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  roleText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#FFFFFF' },
  content: { padding: 16 },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1F2933' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    marginBottom: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIconWrapper: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1F2933' },
  logoutBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 30, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#DC2626' },
});