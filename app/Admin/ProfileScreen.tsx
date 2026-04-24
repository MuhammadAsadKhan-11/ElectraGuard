import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface Props {
  navigation: any;
}

export default function ProfileScreen({ navigation }: Props) {
  const adminInfo = {
    name: 'Zain Ahmed',
    role: 'System Administrator',
    email: 'zain.ahmed@utility.gov.pk',
    phone: '+92 300 1234567',
    department: 'Utility Management',
    employeeId: 'EMP-2024-001',
    lastLogin: 'Today, 9:30 AM',
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {} },
    ]);
  };

  const MenuItem = ({ icon, label, value, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{adminInfo.name.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <Text style={styles.adminName}>{adminInfo.name}</Text>
          <Text style={styles.adminRole}>{adminInfo.role}</Text>
          <View style={styles.activeTag}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <MenuItem icon="📧" label="Email" value={adminInfo.email} />
          <MenuItem icon="📞" label="Phone" value={adminInfo.phone} />
          <MenuItem icon="🏢" label="Department" value={adminInfo.department} />
          <MenuItem icon="🪪" label="Employee ID" value={adminInfo.employeeId} />
          <MenuItem icon="🕐" label="Last Login" value={adminInfo.lastLogin} />
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>43</Text>
              <Text style={styles.statLabel}>Cases Reviewed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>167</Text>
              <Text style={styles.statLabel}>Risks Flagged</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <MenuItem icon="🔔" label="Notifications" onPress={() => {}} />
          <MenuItem icon="🔒" label="Change Password" onPress={() => {}} />
          <MenuItem icon="🌙" label="Appearance" onPress={() => {}} />
          <MenuItem icon="ℹ️" label="About" onPress={() => {}} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  profileHeader: {
    backgroundColor: Colors.white, alignItems: 'center', padding: 30,
    margin: 16, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  adminName: { fontSize: 22, fontWeight: '700', color: Colors.text },
  adminRole: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  activeTag: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: Colors.success + '15', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: 6 },
  activeText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuIcon: { fontSize: 18, width: 32 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  menuValue: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 20, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  logoutBtn: {
    backgroundColor: Colors.danger + '15', borderRadius: 14, padding: 16,
    marginHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.danger + '40',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.danger },
});
