// app/src/Consumer/NotificationDetailScreen.tsx
// Opened from NotificationsScreen. Shows the notification, the related case
// (only if it belongs to this consumer — enforced by the backend) and its
// evidence files with secure, short-lived view/download links.
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StackBar } from "../../../components/AppChrome";
import { Colors } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { MyCaseEvidence, getMyEvidenceUrl, useMyCase } from "../../../hooks/useMyCase";
import { useMyNotifications } from "../../../hooks/useMyNotifications";
import { fileIcon, formatBytes, openEvidence } from "../../../utils/evidenceDownload";

const STATUS_COLORS: Record<string, string> = {
  Open: "#007AFF",
  "In Progress": "#FF9500",
  Closed: "#34C759",
  Rejected: "#8E8E93",
};

function fullDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

// Image thumbnail through an inline presigned URL; one automatic retry with a
// fresh URL if the first one fails (e.g. expired while the screen was open).
function EvidencePreview({ caseDocId, item }: { caseDocId: string; item: MyCaseEvidence }) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);

  const fetchUrl = async () => {
    try {
      const res = await getMyEvidenceUrl(caseDocId, item.id, "inline");
      setUri(res.url);
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => {
    fetchUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseDocId, item.id]);

  if (failed) {
    return (
      <View style={[styles.preview, styles.previewEmpty]}>
        <Ionicons name="image-outline" size={26} color="#9CA3AF" />
      </View>
    );
  }
  if (!uri) {
    return (
      <View style={[styles.preview, styles.previewEmpty]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.preview}
      resizeMode="cover"
      onError={() => {
        if (!retried) {
          setRetried(true);
          setUri(null);
          fetchUrl();
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

function EvidenceRow({ caseDocId, item, colors }: { caseDocId: string; item: MyCaseEvidence; colors: any }) {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const isImage = item.category === "image" || item.type === "image";

  const run = async (mode: "view" | "download") => {
    if (busy) return;
    setBusy(mode);
    setMessage(null);
    try {
      await openEvidence((disposition) => getMyEvidenceUrl(caseDocId, item.id, disposition), mode);
      setMessage({
        text: mode === "download" ? "Download started. Check your notifications or Downloads folder." : "Opened.",
        error: false,
      });
    } catch (e: any) {
      setMessage({ text: e?.message || "Could not open the file. Please try again.", error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.evidenceRow, { borderColor: colors.border }]}>
      {isImage ? (
        <EvidencePreview caseDocId={caseDocId} item={item} />
      ) : (
        <View style={[styles.preview, styles.previewEmpty]}>
          <Ionicons name={fileIcon(item.category, item.extension) as any} size={26} color={Colors.primary} />
          {!!item.extension && <Text style={styles.extText}>{item.extension.toUpperCase()}</Text>}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.evName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.evMeta, { color: colors.subText }]}>
          {[item.extension?.toUpperCase() || item.fileType, formatBytes(item.size), item.uploadedAt ? fullDate(item.uploadedAt) : item.date]
            .filter(Boolean)
            .join(" • ")}
        </Text>
        {item.downloadable === false ? (
          <Text style={[styles.evMeta, { color: "#B91C1C" }]}>File is not available.</Text>
        ) : (
          <View style={styles.evActions}>
            <TouchableOpacity style={styles.evBtnGhost} onPress={() => run("view")} disabled={!!busy}>
              {busy === "view" ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="eye-outline" size={15} color={Colors.primary} />
                  <Text style={styles.evBtnGhostText}>View</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.evBtn} onPress={() => run("download")} disabled={!!busy}>
              {busy === "download" ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.evBtnText}>Preparing…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.evBtnText}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        {!!message && (
          <Text style={[styles.evMessage, { color: message.error ? "#B91C1C" : "#15803D" }]}>{message.text}</Text>
        )}
      </View>
    </View>
  );
}

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { colors } = useAppSettings();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const { getById, loaded, markRead } = useMyNotifications();
  const notification = id ? getById(id) : undefined;
  const caseDocId = notification?.caseDocId || null;
  const { caseItem, loading: caseLoading, error: caseError, reload } = useMyCase(caseDocId);

  useEffect(() => {
    if (notification && !notification.read) markRead([notification.id]);
  }, [notification, markRead]);

  // Hidden tab screens: back would jump to the first tab, so go to the list explicitly.
  const goBack = () => router.navigate("/src/Consumer/NotificationsScreen" as any);

  const statusColor = STATUS_COLORS[caseItem?.status || notification?.caseStatus || ""] || Colors.primary;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <StackBar title="Notification" subtitle={notification?.caseId ? `Case ${notification.caseId}` : undefined} onBack={goBack} />

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !notification ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={40} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: colors.text }]}>This notification is no longer available.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
        >
          {/* ── Notification ── */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
            <Text style={[styles.when, { color: colors.subText }]}>{fullDate(notification.createdAt)}</Text>
            {!!notification.message && (
              <Text style={[styles.message, { color: colors.text }]}>{notification.message}</Text>
            )}
          </View>

          {/* ── Case ── */}
          {caseDocId && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Case details</Text>
                {(caseItem?.status || notification.caseStatus) && (
                  <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>
                      {caseItem?.status || notification.caseStatus}
                    </Text>
                  </View>
                )}
              </View>

              {caseLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : caseError || !caseItem ? (
                <View>
                  <Text style={[styles.rowValue, { color: "#B91C1C" }]}>{caseError || "Case not found."}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={reload}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {[
                    ["Case ID", caseItem.caseNumber],
                    ["Title", caseItem.title],
                    ["Priority", caseItem.priority],
                    ["Area", caseItem.area],
                    ["Inspector", caseItem.inspectorAssigned ? caseItem.inspector || "Assigned" : "Not assigned yet"],
                    ["Opened", fullDate(caseItem.createdAt)],
                    ["Last update", fullDate(caseItem.updatedAt)],
                  ]
                    .filter(([, v]) => !!v)
                    .map(([label, value]) => (
                      <View key={label} style={styles.row}>
                        <Text style={[styles.rowLabel, { color: colors.subText }]}>{label}</Text>
                        <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
                      </View>
                    ))}
                  {!!caseItem.description && (
                    <Text style={[styles.description, { color: colors.text }]}>{caseItem.description}</Text>
                  )}

                  {caseItem.remarks.length > 0 && (
                    <>
                      <Text style={[styles.subTitle, { color: colors.text }]}>Messages from the utility</Text>
                      {caseItem.remarks.map((r, i) => (
                        <View key={i} style={styles.remark}>
                          <Text style={[styles.remarkText, { color: colors.text }]}>{r.message}</Text>
                          {!!r.at && <Text style={[styles.when, { color: colors.subText }]}>{fullDate(r.at)}</Text>}
                        </View>
                      ))}
                    </>
                  )}

                  {caseItem.timeline.length > 0 && (
                    <>
                      <Text style={[styles.subTitle, { color: colors.text }]}>Timeline</Text>
                      {[...caseItem.timeline].reverse().map((t, i) => (
                        <View key={i} style={styles.timelineRow}>
                          <View style={styles.dot} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.timelineText, { color: colors.text }]}>{t.action}</Text>
                            <Text style={[styles.when, { color: colors.subText }]}>
                              {t.date} {t.time}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Evidence ── */}
          {caseItem && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Evidence {caseItem.evidence.length ? `(${caseItem.evidence.length})` : ""}
              </Text>
              {caseItem.evidence.length === 0 ? (
                <Text style={[styles.rowValue, { color: colors.subText, marginTop: 8 }]}>
                  No files have been shared on this case.
                </Text>
              ) : (
                caseItem.evidence.map((ev) => (
                  <EvidenceRow key={ev.id} caseDocId={caseItem.id} item={ev} colors={colors} />
                ))
              )}
              <Text style={[styles.secureNote, { color: colors.subText }]}>
                Links are private and expire after a few minutes. Tapping again creates a new link.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  title: { fontFamily: "Poppins_600SemiBold", fontSize: 17 },
  when: { fontSize: 11, marginTop: 3 },
  message: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 12 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  subTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 13, marginTop: 16, marginBottom: 6 },
  remark: { backgroundColor: "#E8F1FF", borderRadius: 10, padding: 10, marginBottom: 6 },
  remarkText: { fontSize: 13, lineHeight: 18 },
  timelineRow: { flexDirection: "row", gap: 10, paddingVertical: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 5 },
  timelineText: { fontSize: 13 },
  evidenceRow: { flexDirection: "row", gap: 12, paddingVertical: 12, borderTopWidth: 1 },
  preview: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#F3F4F6" },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  extText: { fontSize: 9, fontWeight: "700", color: Colors.primary, marginTop: 2 },
  evName: { fontSize: 13, fontWeight: "700" },
  evMeta: { fontSize: 11, marginTop: 2 },
  evActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  evBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 32,
  },
  evBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  evBtnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 32,
    minWidth: 70,
    justifyContent: "center",
  },
  evBtnGhostText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  evMessage: { fontSize: 11, marginTop: 6 },
  secureNote: { fontSize: 11, marginTop: 12 },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 8,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
});
