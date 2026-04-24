import React, { useState } from 'react';
import {
  Alert, Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, getCaseStatusColor, getRiskColor } from '../../constants/Colors';
import { mockInspectors } from '../../data/mockData';
import { Case } from '../../types';

interface Props {
  navigation: any;
  route: { params: { caseItem: Case } };
}

export default function CaseProfileScreen({ navigation, route }: Props) {
  const { caseItem } = route.params;
  const [assignModal, setAssignModal] = useState(false);
  const [assignedInspector, setAssignedInspector] = useState(caseItem.inspector || '');
  const statusColor = getCaseStatusColor(caseItem.status);
  const riskColor = getRiskColor(caseItem.riskLevel);

  const handleAssign = (inspectorName: string) => {
    setAssignedInspector(inspectorName);
    setAssignModal(false);
    Alert.alert('Assigned', `Case assigned to ${inspectorName}`);
  };

  const handleClose = () => {
    Alert.alert('Close Case', 'Are you sure you want to close this case?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: () => { navigation.goBack(); } },
    ]);
  };

  const handleEscalate = () => {
    Alert.alert('Escalate', 'Case has been escalated to the department head.', [
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Inspector Assign Modal */}
      <Modal visible={assignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Inspector</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {mockInspectors.map(ins => (
              <TouchableOpacity
                key={ins.id}
                style={styles.inspectorRow}
                onPress={() => handleAssign(ins.name)}
              >
                <View style={styles.inspectorInfo}>
                  <Text style={styles.inspectorIcon}>👤</Text>
                  <View>
                    <Text style={styles.inspectorName}>{ins.name}</Text>
                    <Text style={styles.inspectorArea}>{ins.area}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.assignBtn, { backgroundColor: ins.available ? Colors.primary : Colors.border }]}
                  onPress={() => ins.available && handleAssign(ins.name)}
                >
                  <Text style={styles.assignBtnText}>
                    {assignedInspector === ins.name ? 'Assigned' : ins.available ? 'Assign' : 'Busy'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.caseNumber}>{caseItem.caseNumber}</Text>
            <Text style={styles.caseName}>{caseItem.consumerName} • {caseItem.meterNumber}</Text>
          </View>
          <View style={styles.headerBadges}>
            <View style={[styles.badge, { backgroundColor: statusColor + '20', borderColor: statusColor, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{caseItem.status}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: riskColor + '15', marginTop: 4 }]}>
              <Text style={[styles.badgeText, { color: riskColor }]}>{caseItem.riskLevel}</Text>
            </View>
          </View>
        </View>

        {/* Case Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case Details</Text>
          <Text style={styles.caseDesc}>{caseItem.description}</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailLabel}>Area</Text>
              <Text style={styles.detailValue}>{caseItem.area}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{caseItem.createdAt}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case Timeline</Text>
          {caseItem.timeline.map((t, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDotCol}>
                <View style={[styles.timelineDot, { backgroundColor: i === 0 ? Colors.primary : Colors.border }]} />
                {i < caseItem.timeline.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineAction}>{t.action}</Text>
                <Text style={styles.timelineDate}>{t.date} {t.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Evidence */}
        <View style={styles.card}>
          <View style={styles.evidenceHeader}>
            <Text style={styles.cardTitle}>Evidence ({caseItem.evidenceImages.length})</Text>
            <TouchableOpacity style={styles.uploadBtn}>
              <Text style={styles.uploadBtnText}>⬆ Upload</Text>
            </TouchableOpacity>
          </View>
          {caseItem.evidenceImages.length === 0 ? (
            <Text style={styles.noEvidence}>No evidence uploaded yet</Text>
          ) : (
            caseItem.evidenceImages.map((img, i) => (
              <View key={i} style={styles.evidenceItem}>
                <View style={styles.evidenceIconBox}>
                  <Text style={styles.evidenceIcon}>🖼</Text>
                </View>
                <View>
                  <Text style={styles.evidenceName}>{img.name}</Text>
                  <Text style={styles.evidenceMeta}>{img.uploadedBy} • {img.date}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Assign Inspector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assign Inspector</Text>
          {mockInspectors.map(ins => (
            <View key={ins.id} style={styles.inspectorRow}>
              <View style={styles.inspectorInfo}>
                <Text style={styles.inspectorIcon}>👤</Text>
                <View>
                  <Text style={styles.inspectorName}>{ins.name}</Text>
                  <Text style={styles.inspectorArea}>{ins.area}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.assignBtn, {
                  backgroundColor: assignedInspector === ins.name
                    ? Colors.success
                    : ins.available ? Colors.primary : Colors.border
                }]}
                onPress={() => ins.available && handleAssign(ins.name)}
              >
                <Text style={styles.assignBtnText}>
                  {assignedInspector === ins.name ? 'Assigned' : ins.available ? 'Assign' : 'Busy'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={handleClose}>
            <Text style={styles.actionBtnText}>✓ Close Case</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.danger }]} onPress={handleEscalate}>
            <Text style={styles.actionBtnText}>⬆ Escalate</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white,
    padding: 16, margin: 16, borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: '600' },
  headerInfo: { flex: 1 },
  caseNumber: { fontSize: 18, fontWeight: '700', color: Colors.text },
  caseName: { fontSize: 12, color: Colors.textSecondary },
  headerBadges: { alignItems: 'flex-end' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  caseDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  detailGrid: { flexDirection: 'row', gap: 20 },
  detailItem: { flex: 1 },
  detailIcon: { fontSize: 16, marginBottom: 4 },
  detailLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineDotCol: { alignItems: 'center', width: 24, marginRight: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineAction: { fontSize: 13, fontWeight: '500', color: Colors.text, lineHeight: 18 },
  timelineDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  evidenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  uploadBtn: { backgroundColor: Colors.primary + '15', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  uploadBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  noEvidence: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', padding: 16 },
  evidenceItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  evidenceIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  evidenceIcon: { fontSize: 22 },
  evidenceName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  evidenceMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  inspectorRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  inspectorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inspectorIcon: { fontSize: 20 },
  inspectorName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  inspectorArea: { fontSize: 12, color: Colors.textSecondary },
  assignBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  assignBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  assignModal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textSecondary },
});
