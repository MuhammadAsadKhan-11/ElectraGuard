import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

// ─── Types ────────────────────────────────────────────────────────
interface IssueType {
  id: string;
  label: string;
  value: string;
}

interface Report {
  id: string;
  referenceId: string;
  issueType: string;
  description: string;
  meterLocation: string;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Resolved' | 'In Progress';
  resolution?: string;
  createdAt: Date;
  imageUrl?: string;
}

interface ConsumerData {
  consumerId: string;
  name: string;
  email: string;
}

// ─── Main Component ───────────────────────────────────────────────
export default function ReportScreen() {
  const [consumer, setConsumer]               = useState<ConsumerData | null>(null);
  const [issueTypes, setIssueTypes]           = useState<IssueType[]>([]);
  const [previousReports, setPreviousReports] = useState<Report[]>([]);

  // Form state
  const [selectedIssue, setSelectedIssue]     = useState<IssueType | null>(null);
  const [description, setDescription]         = useState('');
  const [meterLocation, setMeterLocation]     = useState('');
  const [urgency, setUrgency]                 = useState<'Low' | 'Medium' | 'High'>('Low');
  const [selectedImage, setSelectedImage]     = useState<string | null>(null); // base64 string
  const [showDropdown, setShowDropdown]       = useState(false);

  // Loading states
  const [loadingTypes, setLoadingTypes]       = useState(true);
  const [submitting, setSubmitting]           = useState(false);
  const [loadingReports, setLoadingReports]   = useState(true);

  // ── Auth + fetch consumer ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'consumers'),
          where('email', '==', user.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as ConsumerData;
          setConsumer(data);
          await fetchPreviousReports(data.consumerId);
        }
      } catch (e) {
        console.error('Error fetching consumer:', e);
      }
    });
    return unsub;
  }, []);

  // ── Fetch issue types from Firestore ──
  useEffect(() => {
    const fetchIssueTypes = async () => {
      try {
        const snap = await getDocs(collection(db, 'issueTypes'));
        const types: IssueType[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<IssueType, 'id'>),
        }));
        setIssueTypes(types);
      } catch (e) {
        console.error('Error fetching issue types:', e);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchIssueTypes();
  }, []);

  // ── Fetch previous reports ──
  const fetchPreviousReports = async (consumerId: string) => {
    try {
      const q = query(
        collection(db, 'reports'),
        where('consumerId', '==', consumerId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const reports: Report[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Report, 'id'>),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      }));
      setPreviousReports(reports);
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  // ── Pick Image — directly get base64 ──
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,   // 50% quality — keeps size small for Firestore
      base64: true,   // get base64 directly, no Storage needed
    });

    if (!result.canceled && result.assets[0].base64) {
      // Store as data URI so Image component can display it directly
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ── Generate reference ID ──
  const generateRefId = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `RPT-${num}`;
  };

  // ── Submit Report ──
  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert('Required', 'Please select an issue type.'); return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe the issue.'); return;
    }
    if (!meterLocation.trim()) {
      Alert.alert('Required', 'Please enter meter location.'); return;
    }
    if (!consumer) {
      Alert.alert('Error', 'Consumer data not loaded.'); return;
    }

    setSubmitting(true);
    try {
      const referenceId = generateRefId();

      await addDoc(collection(db, 'reports'), {
        consumerId:    consumer.consumerId,
        consumerName:  consumer.name,
        email:         consumer.email,
        referenceId,
        issueType:     selectedIssue.label,
        issueValue:    selectedIssue.value,
        description:   description.trim(),
        meterLocation: meterLocation.trim(),
        urgencyLevel:  urgency,
        status:        'Pending',
        imageUrl:      selectedImage ?? '',   // base64 string saved directly
        createdAt:     new Date(),
        resolution:    '',
      });

      Alert.alert(
        'Report Submitted ✅',
        `Your reference ID is: ${referenceId}\nWe will contact you within 24–48 hours.`
      );

      // Reset form
      setSelectedIssue(null);
      setDescription('');
      setMeterLocation('');
      setUrgency('Low');
      setSelectedImage(null);

      // Refresh previous reports list
      await fetchPreviousReports(consumer.consumerId);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status color helper ──
  const statusColor = (status: string) => {
    if (status === 'Resolved')    return { bg: '#DCFCE7', text: '#16A34A' };
    if (status === 'In Progress') return { bg: '#FEF9C3', text: '#CA8A04' };
    return                               { bg: '#FEE2E2', text: '#DC2626' };
  };

  const urgencyColors = {
    Low:    '#2EC4B6',
    Medium: '#F59E0B',
    High:   '#EF4444',
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Report Theft</Text>
          <Text style={styles.heroSub}>
            Submit meter issues, billing concerns, or unusual activity
          </Text>
        </View>

        {/* ══════════════ SUBMIT FORM ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Submit New Report</Text>

          {/* Issue Type Dropdown */}
          <Text style={styles.fieldLabel}>Issue Type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.8}
          >
            <Text style={selectedIssue ? styles.dropdownSelected : styles.dropdownPlaceholder}>
              {selectedIssue ? selectedIssue.label : 'Select issue type'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please describe the issue in detail..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Meter Location */}
          <Text style={styles.fieldLabel}>Meter Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Outside main gate..."
            placeholderTextColor="#9CA3AF"
            value={meterLocation}
            onChangeText={setMeterLocation}
          />

          {/* Urgency Level */}
          <Text style={styles.fieldLabel}>Urgency Level</Text>
          <View style={styles.urgencyRow}>
            {(['Low', 'Medium', 'High'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.urgencyBtn,
                  urgency === level && {
                    backgroundColor: urgencyColors[level],
                    borderColor: urgencyColors[level],
                  },
                ]}
                onPress={() => setUrgency(level)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.urgencyBtnText,
                  urgency === level && { color: '#FFFFFF' },
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upload Photo */}
          <Text style={styles.fieldLabel}>Upload Photos (Optional)</Text>
          <TouchableOpacity
            style={styles.imageUploadBox}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {selectedImage ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <Text style={styles.imageChangeTxt}>Tap to change</Text>
              </View>
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                <Text style={styles.imageUploadTitle}>Take or upload photos of the issue</Text>
                <Text style={styles.imageUploadSub}>Supports JPG, PNG up to 10MB each</Text>
                <View style={styles.selectImgBtn}>
                  <Ionicons name="image-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.selectImgBtnText}>Select Images</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* What happens next */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            {[
              'Your report will be reviewed by our technical team',
              "You'll receive a reference ID for tracking",
              "We'll contact you within 24–48 hours",
              'An inspector may be dispatched if needed',
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════ PREVIOUS REPORTS ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Previous Reports</Text>
          {loadingReports ? (
            <ActivityIndicator color="#0B3C5D" style={{ marginVertical: 20 }} />
          ) : previousReports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={28} color="#D1D5DB" />
              <Text style={styles.emptyText}>No reports submitted yet</Text>
            </View>
          ) : (
            previousReports.map((report) => {
              const sc = statusColor(report.status);
              return (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportRefId}>{report.referenceId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: sc.text }]}>
                        {report.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reportIssueType}>{report.issueType}</Text>
                  <View style={styles.reportDateRow}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.reportDate}>
                      {report.createdAt.toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {report.resolution ? (
                    <Text style={styles.reportResolution}>
                      Resolution: {report.resolution}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* ══════════════ DISCO CONTACT ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DISCO Contact Information</Text>
          {[
            {
              icon: 'call-outline',
              label: 'Helpline',
              value: '118',
              action: () => Linking.openURL('tel:118'),
            },
            {
              icon: 'mail-outline',
              label: 'Email',
              value: 'support@lesco.gov.pk',
              action: () => Linking.openURL('mailto:support@lesco.gov.pk'),
            },
            {
              icon: 'globe-outline',
              label: 'Website',
              value: 'lesco.gov.pk',
              action: () => Linking.openURL('https://lesco.gov.pk'),
            },
          ].map(({ icon, label, value, action }) => (
            <TouchableOpacity
              key={label}
              style={styles.contactRow}
              onPress={action}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconBox}>
                <Ionicons name={icon as any} size={20} color="#0B3C5D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{label}</Text>
                <Text style={styles.contactValue}>{value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Issue Type Dropdown Modal ── */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
          activeOpacity={1}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Issue Type</Text>
            {loadingTypes ? (
              <ActivityIndicator color="#0B3C5D" style={{ marginVertical: 20 }} />
            ) : issueTypes.length === 0 ? (
              <Text style={styles.emptyText}>No issue types found in database.</Text>
            ) : (
              issueTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.modalOption,
                    selectedIssue?.id === type.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedIssue(type);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedIssue?.id === type.id && styles.modalOptionTextActive,
                  ]}>
                    {type.label}
                  </Text>
                  {selectedIssue?.id === type.id && (
                    <Ionicons name="checkmark" size={18} color="#0B3C5D" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F8FAFC' },
  container:     { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 100 },

  pageHeader:    { marginBottom: 6 },
  pageTitle:     { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9CA3AF' },

  heroCard:      { backgroundColor: '#0B3C5D', borderRadius: 16, padding: 20, marginBottom: 16 },
  heroTitle:     { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#FFFFFF', marginBottom: 4 },
  heroSub:       { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#93C5FD' },

  card:          {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle:     { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1F2933', marginBottom: 16 },

  fieldLabel:    { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 12 },

  dropdown:      {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
  },
  dropdownPlaceholder: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9CA3AF' },
  dropdownSelected:    { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1F2933' },

  textArea:      {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#1F2933',
    backgroundColor: '#F9FAFB',
    minHeight: 110,
  },
  input:         {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#1F2933',
    backgroundColor: '#F9FAFB',
  },

  urgencyRow:    { flexDirection: 'row', gap: 10 },
  urgencyBtn:    {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  urgencyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280' },

  imageUploadBox: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
    minHeight: 130,
    justifyContent: 'center',
  },
  imageUploadTitle:    { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#374151' },
  imageUploadSub:      { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF' },
  selectImgBtn:        {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0B3C5D',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  selectImgBtnText:    { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  imagePreviewWrapper: { alignItems: 'center', gap: 8 },
  imagePreview:        { width: 200, height: 140, borderRadius: 10 },
  imageChangeTxt:      { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },

  submitBtn:     {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B3C5D',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },

  infoBox:       { backgroundColor: '#EFF9F8', borderRadius: 12, padding: 16, marginTop: 16 },
  infoTitle:     { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#0B3C5D', marginBottom: 10 },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  infoDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2EC4B6', marginTop: 6 },
  infoText:      { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#374151', flex: 1 },

  reportCard:    { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 12 },
  reportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reportRefId:   { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#0B3C5D' },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  reportIssueType: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1F2933', marginBottom: 6 },
  reportDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportDate:    { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF' },
  reportResolution: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },

  contactRow:    {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel:  { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9CA3AF' },
  contactValue:  { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1F2933' },

  emptyBox:      { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText:     { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9CA3AF' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox:      {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle:    { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1F2933', marginBottom: 16 },
  modalOption:   {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive:     { backgroundColor: '#EFF6FF' },
  modalOptionText:       { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#374151' },
  modalOptionTextActive: { fontFamily: 'Inter_600SemiBold', color: '#0B3C5D' },
});