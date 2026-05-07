import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';

// Firebase
import { ref as dbRef, get, push, set } from 'firebase/database';
import { rtdb } from '../../firebaseConfig'; // ← rtdb, storage hata diya
import { sendPushNotification } from '../utils/notifications';

interface Props {
  navigation: any;
}

type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
type CaseCategory = 'Meter Tampering' | 'Illegal Connection' | 'Billing Fraud' | 'Service Theft' | 'Other';
type Priority = 'Low' | 'Normal' | 'High' | 'Urgent';

interface UploadedFile {
  uri: string;
  name: string;
  type: 'image' | 'document';
  mimeType?: string;
}

const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
const CASE_CATEGORIES: CaseCategory[] = [
  'Meter Tampering', 'Illegal Connection', 'Billing Fraud', 'Service Theft', 'Other',
];
const PRIORITIES: Priority[] = ['Low', 'Normal', 'High', 'Urgent'];

function Dropdown<T extends string>({
  label, options, value, onChange, placeholder,
}: {
  label: string; options: T[]; value: T | ''; onChange: (v: T) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label} *</Text>
      <TouchableOpacity style={dd.btn} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={[dd.btnText, !value && { color: Colors.textSecondary }]}>
          {value || placeholder}
        </Text>
        <Text style={dd.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={dd.menu}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[dd.item, value === opt && dd.itemActive]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[dd.itemText, value === opt && dd.itemTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  btn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  btnText: { fontSize: 14, color: Colors.text },
  arrow: { fontSize: 11, color: Colors.textSecondary },
  menu: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, marginTop: 4, overflow: 'hidden', zIndex: 99,
  },
  item: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemActive: { backgroundColor: Colors.primary + '12' },
  itemText: { fontSize: 14, color: Colors.text },
  itemTextActive: { color: Colors.primary, fontWeight: '600' },
});

export default function CreateCaseScreen({ navigation }: Props) {
  const [consumerId, setConsumerId] = useState('');
  const [consumerName, setConsumerName] = useState('');
  const [area, setArea] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('');
  const [category, setCategory] = useState<CaseCategory | ''>('');
  const [description, setDescription] = useState('');
  const [inspector, setInspector] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const picked: UploadedFile[] = result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName || `image_${Date.now()}.jpg`,
        type: 'image',
        mimeType: a.mimeType || 'image/jpeg',
      }));
      setFiles(prev => [...prev, ...picked]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', copyToCacheDirectory: true, multiple: true,
    });
    if (!result.canceled) {
      const picked: UploadedFile[] = result.assets.map(a => ({
        uri: a.uri, name: a.name, type: 'document',
        mimeType: a.mimeType || 'application/octet-stream',
      }));
      setFiles(prev => [...prev, ...picked]);
    }
  };

  // Storage hata diya — sirf file info save hogi (URL nahi)
  const handleSubmit = async () => {
    if (!consumerId.trim() || !consumerName.trim() || !area.trim() || !riskLevel || !category || !description.trim() || !priority) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const caseNumber = `CASE${Date.now().toString().slice(-6)}`;
      const newCaseRef = push(dbRef(rtdb, 'cases')); // ← rtdb
      const caseId = newCaseRef.key!;

      const now = new Date();
      const caseData = {
        id: caseId,
        caseNumber,
        consumerId: consumerId.trim(),
        consumerName: consumerName.trim(),
        area: area.trim(),
        riskLevel,
        category,
        description: description.trim(),
        inspector: inspector.trim() || null,
        priority,
        status: 'Open',
        createdAt: now.toISOString().split('T')[0],
        evidences: files.length,
        evidenceImages: files.map(f => ({ name: f.name, type: f.type, uri: f.uri })),
        timeline: [
          {
            action: `Case created — ${category}`,
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().slice(0, 5),
          },
        ],
        meterNumber: consumerId.trim(),
      };

      await set(newCaseRef, caseData);

      try {
        const consumerSnap = await get(dbRef(rtdb, `consumers/${consumerId.trim()}`)); // ← rtdb
        const consumerData = consumerSnap.val();
        if (consumerData?.pushToken) {
          await sendPushNotification(
            consumerData.pushToken,
            '⚠️ Case Filed Against Your Account',
            `A new case (${caseNumber}) has been filed regarding: ${category}. Our team will investigate shortly.`,
          );
        }
        await push(dbRef(rtdb, `notifications/${consumerId.trim()}`), { // ← rtdb
          type: 'case_filed',
          caseId,
          caseNumber,
          message: `A new case (${caseNumber}) has been filed: ${category}`,
          timestamp: now.toISOString(),
          read: false,
        });
      } catch (notifErr) {
        console.warn('Notification failed (non-critical):', notifErr);
      }

      Alert.alert(
        '✅ Case Created',
        `Case ${caseNumber} has been created successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', `Failed to create case: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Case</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Consumer ID *</Text>
            <TextInput style={styles.input} placeholder="e.g. CONS-2024-1234"
              placeholderTextColor={Colors.textSecondary} value={consumerId}
              onChangeText={setConsumerId} autoCapitalize="characters" />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Consumer Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Ahmad Ali"
              placeholderTextColor={Colors.textSecondary} value={consumerName}
              onChangeText={setConsumerName} />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Area / Location *</Text>
            <TextInput style={styles.input} placeholder="Enter area or location"
              placeholderTextColor={Colors.textSecondary} value={area}
              onChangeText={setArea} />
          </View>

          <Dropdown label="Risk Level" options={RISK_LEVELS} value={riskLevel}
            onChange={setRiskLevel} placeholder="Select risk level" />

          <Dropdown label="Case Category" options={CASE_CATEGORIES} value={category}
            onChange={setCategory} placeholder="Select case category" />

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Description *</Text>
            <TextInput style={[styles.input, styles.textArea]}
              placeholder="Provide detailed description..."
              placeholderTextColor={Colors.textSecondary} value={description}
              onChangeText={setDescription} multiline numberOfLines={4}
              textAlignVertical="top" />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Assign Inspector</Text>
            <TextInput style={styles.input} placeholder="Inspector name (optional)"
              placeholderTextColor={Colors.textSecondary} value={inspector}
              onChangeText={setInspector} />
          </View>

          <Dropdown label="Priority Level" options={PRIORITIES} value={priority}
            onChange={setPriority} placeholder="Select priority level" />

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Evidence Upload</Text>
            <View style={styles.uploadBtnRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
                <Text style={styles.uploadBtnIcon}>🖼</Text>
                <Text style={styles.uploadBtnText}>Upload Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadBtn, styles.uploadBtnDoc]} onPress={pickDocument} activeOpacity={0.8}>
                <Text style={styles.uploadBtnIcon}>📄</Text>
                <Text style={[styles.uploadBtnText, { color: Colors.primary }]}>Upload Document</Text>
              </TouchableOpacity>
            </View>
            {files.length > 0 && (
              <View style={styles.fileList}>
                {files.map((f, i) => (
                  <View key={i} style={styles.fileItem}>
                    <Text style={styles.fileIcon}>{f.type === 'image' ? '🖼' : '📄'}</Text>
                    <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => removeFile(i)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
            {submitting ? (
              <View style={styles.submitLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>Creating Case…</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>Create Case</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={submitting}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, padding: 16, margin: 16, marginTop: 40,
    borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  form: { paddingHorizontal: 16, paddingTop: 4 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: Colors.text,
  },
  textArea: { height: 110, paddingTop: 12 },
  uploadSection: { marginBottom: 20 },
  uploadBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  uploadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13,
  },
  uploadBtnDoc: {
    backgroundColor: Colors.primary + '15', borderWidth: 1, borderColor: Colors.primary,
  },
  uploadBtnIcon: { fontSize: 16 },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  fileList: { marginTop: 12, gap: 8 },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  fileIcon: { fontSize: 18 },
  fileName: { flex: 1, fontSize: 13, color: Colors.text },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: Colors.danger, fontWeight: '600' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12, shadowColor: Colors.primary,
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
});