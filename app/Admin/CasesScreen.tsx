import React, { useState } from 'react';
import {
  FlatList, Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, getCaseStatusColor, getRiskColor } from '../../constants/Colors';
import { mockCases, mockNotifications } from '../../data/mockData';
import { Case } from '../../types';

interface Props {
  navigation: any;
}

type StatusFilter = 'All' | 'Open' | 'In Progress' | 'Closed' | 'Rejected';

const NotificationsModal = ({ visible, onClose }: any) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.notifModal}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle}>Case Notifications</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
        </View>
        <FlatList
          data={mockNotifications}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={[styles.notifItem, !item.read && styles.notifUnread]}>
              <Text style={styles.notifIcon}>{item.type === 'case_filed' ? '📋' : item.type === 'case_resolved' ? '✅' : '⚠️'}</Text>
              <View style={styles.notifContent}>
                <Text style={styles.notifMsg}>{item.message}</Text>
                <Text style={styles.notifConsumer}>{item.consumer}</Text>
                <Text style={styles.notifTime}>{item.timestamp}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
          )}
        />
      </View>
    </View>
  </Modal>
);

const StatusOverview = ({ onFilter, activeFilter }: { onFilter: (s: StatusFilter) => void; activeFilter: StatusFilter }) => {
  const counts = {
    Open: mockCases.filter(c => c.status === 'Open').length,
    'In Progress': mockCases.filter(c => c.status === 'In Progress').length,
    Closed: mockCases.filter(c => c.status === 'Closed').length,
    Rejected: mockCases.filter(c => c.status === 'Rejected').length,
  };

  const items = [
    { label: 'Open Cases', key: 'Open' as StatusFilter, count: counts.Open, color: Colors.warning, suffix: '(61%)' },
    { label: 'In Progress', key: 'In Progress' as StatusFilter, count: counts['In Progress'], color: Colors.primary, suffix: '(46%)' },
    { label: 'Closed', key: 'Closed' as StatusFilter, count: counts.Closed, color: Colors.success, suffix: '(15%)' },
    { label: 'Rejected', key: 'Rejected' as StatusFilter, count: counts.Rejected, color: Colors.danger, suffix: '(4%)' },
  ];

  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <Text style={styles.overviewTitle}>Case Status Overview</Text>
        <Text style={styles.overviewSub}>Total {mockCases.length} active cases</Text>
      </View>
      {items.map(item => (
        <TouchableOpacity
          key={item.key}
          style={styles.overviewRow}
          onPress={() => onFilter(activeFilter === item.key ? 'All' : item.key)}
        >
          <View style={[styles.statusDot, { backgroundColor: item.color }]} />
          <Text style={styles.overviewLabel}>{item.label}</Text>
          <View style={styles.overviewBar}>
            <View style={[styles.overviewFill, { width: `${(item.count / mockCases.length) * 100}%`, backgroundColor: item.color }]} />
          </View>
          <Text style={[styles.overviewCount, { color: item.color }]}>{item.count}<Text style={styles.overviewSuffix}> {item.suffix}</Text></Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const CaseCard = ({ caseItem, onPress }: { caseItem: Case; onPress: () => void }) => {
  const statusColor = getCaseStatusColor(caseItem.status);
  const riskColor = getRiskColor(caseItem.riskLevel);
  return (
    <TouchableOpacity style={styles.caseCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.caseCardHeader}>
        <View style={styles.caseIdRow}>
          <Text style={styles.caseNumber}>{caseItem.caseNumber}</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor + '18' }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>{caseItem.riskLevel}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{caseItem.status}</Text>
        </View>
      </View>
      <Text style={styles.caseName}>{caseItem.consumerName}</Text>
      <Text style={styles.caseDesc} numberOfLines={2}>{caseItem.description}</Text>
      <View style={styles.caseMetaRow}>
        <Text style={styles.caseMeta}>📍 {caseItem.area}</Text>
        <Text style={styles.caseMeta}>📅 {caseItem.createdAt}</Text>
      </View>
      <View style={styles.caseFooter}>
        {caseItem.inspector ? (
          <Text style={styles.caseInspector}>👤 {caseItem.inspector}</Text>
        ) : (
          <Text style={[styles.caseInspector, { color: Colors.warning }]}>⚠ Unassigned</Text>
        )}
        <Text style={styles.evidenceCount}>🖼 {caseItem.evidences} evidence{caseItem.evidences !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.caseArrow}>›</Text>
    </TouchableOpacity>
  );
};

export default function CasesScreen({ navigation }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [notifVisible, setNotifVisible] = useState(false);
  const unread = mockNotifications.filter(n => !n.read).length;

  const filtered = mockCases.filter(c =>
    statusFilter === 'All' ? true : c.status === statusFilter
  );

  const tabFilters: StatusFilter[] = ['Open', 'In Progress', 'Closed'];

  return (
    <SafeAreaView style={styles.safe}>
      <NotificationsModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Case Management</Text>
            <Text style={styles.headerSub}>Track and manage theft investigation cases</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setNotifVisible(true)}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unread > 0 && (
              <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unread}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Overview */}
        <StatusOverview onFilter={setStatusFilter} activeFilter={statusFilter} />

        {/* Tab Filters */}
        <View style={styles.tabRow}>
          {tabFilters.map(f => {
            const cnt = mockCases.filter(c => c.status === f).length;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.tabBtn, statusFilter === f && styles.tabBtnActive]}
                onPress={() => setStatusFilter(statusFilter === f ? 'All' : f)}
              >
                <Text style={[styles.tabText, statusFilter === f && styles.tabTextActive]}>
                  {f} ({cnt})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Case List */}
        <View style={styles.listContainer}>
          {filtered.map(c => (
            <CaseCard
              key={c.id}
              caseItem={c}
              onPress={() => navigation.navigate('CaseProfile', { caseItem: c })}
            />
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No cases found</Text>
            </View>
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.white, padding: 20, margin: 16, borderRadius: 16,marginTop: 40,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: Colors.danger,
    borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  overviewCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  overviewHeader: { marginBottom: 14 },
  overviewTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  overviewSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  overviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  overviewLabel: { fontSize: 13, color: Colors.text, width: 90 },
  overviewBar: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  overviewFill: { height: '100%', borderRadius: 3 },
  overviewCount: { fontSize: 14, fontWeight: '700', width: 60, textAlign: 'right' },
  overviewSuffix: { fontSize: 10, fontWeight: '400', color: Colors.textSecondary },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  listContainer: { paddingHorizontal: 16, gap: 12 },
  caseCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  caseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  caseIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caseNumber: { fontSize: 15, fontWeight: '700', color: Colors.text },
  riskBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  riskBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  caseName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  caseDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  caseMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  caseMeta: { fontSize: 11, color: Colors.textSecondary },
  caseFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  caseInspector: { fontSize: 12, color: Colors.textSecondary },
  evidenceCount: { fontSize: 12, color: Colors.textSecondary },
  caseArrow: { position: 'absolute', right: 16, top: '50%', fontSize: 20, color: Colors.textSecondary },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  notifModal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 30 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  notifTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textSecondary, padding: 4 },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  notifUnread: { backgroundColor: Colors.primary + '08' },
  notifIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  notifContent: { flex: 1 },
  notifMsg: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  notifConsumer: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  notifTime: { fontSize: 11, color: Colors.textSecondary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 },
});
