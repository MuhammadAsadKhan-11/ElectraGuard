import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { palette } from "../../theme";

export function PrimaryButton({
  label,
  onPress,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity style={styles.primary} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      {loading ? (
        <ActivityIndicator color={palette.black} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.black} /> : null}
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondary} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatisticCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.stat}>
      {icon ? (
        <View style={styles.statIcon}>
          <Ionicons name={icon} size={16} color={palette.black} />
        </View>
      ) : null}
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function CustomInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={palette.info}
      style={styles.input}
      {...props}
    />
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={palette.info} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.info}
        style={styles.searchInput}
      />
    </View>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "error" | "info" }) {
  const color =
    tone === "success" ? palette.success : tone === "warning" ? palette.warning : tone === "error" ? palette.error : palette.info;
  return (
    <View style={[styles.badge, { backgroundColor: color + "18" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.add} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="add" size={26} color={palette.black} />
    </TouchableOpacity>
  );
}

export function EmptyState({ title, icon = "file-tray-outline" }: { title: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={palette.soft} />
      <Text style={styles.emptyText}>{title}</Text>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={palette.yellow} />
    </View>
  );
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.chart}>
      <Text style={styles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={styles.chartSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function NotificationCard({
  title,
  message,
  time,
}: {
  title: string;
  message: string;
  time?: string;
}) {
  return (
    <View style={styles.note}>
      <View style={styles.noteDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.noteTitle}>{title}</Text>
        <Text style={styles.noteBody}>{message}</Text>
        {time ? <Text style={styles.chartSub}>{time}</Text> : null}
      </View>
    </View>
  );
}

export function CustomModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.chartTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={palette.black} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function CustomBottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.modalHead}>
            <Text style={styles.chartTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={palette.black} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: palette.yellow,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryText: { color: palette.black, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  secondary: {
    backgroundColor: palette.white,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.soft,
  },
  secondaryText: { color: palette.black, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  stat: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.soft,
    padding: 14,
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: palette.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { color: palette.black, fontFamily: "Poppins_700Bold", fontSize: 22 },
  statLabel: { color: palette.info, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: palette.grey,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.soft,
    paddingHorizontal: 14,
    minHeight: 52,
    color: palette.black,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.soft,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: { flex: 1, color: palette.black, fontFamily: "Inter_400Regular", fontSize: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  add: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", justifyContent: "center", padding: 28, gap: 8 },
  emptyText: { color: palette.info, fontFamily: "Inter_400Regular", fontSize: 13 },
  chart: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.soft,
    padding: 16,
  },
  chartTitle: { color: palette.black, fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  chartSub: { color: palette.info, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  note: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.soft,
    padding: 12,
  },
  noteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.yellow, marginTop: 6 },
  noteTitle: { color: palette.black, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  noteBody: { color: palette.info, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%", backgroundColor: palette.white, borderRadius: 18, padding: 16 },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,17,17,0.45)" },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 28,
  },
});
