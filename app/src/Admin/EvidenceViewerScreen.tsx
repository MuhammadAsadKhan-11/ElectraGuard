import { Ionicons } from "@expo/vector-icons";
// app/src/Admin/EvidenceViewerScreen.tsx
// Case Profile ke Evidence list mein kisi item par tap karne se yeh screen khulti hai.
// S3 evidence: a short-lived presigned URL is requested from the backend
// (caseId + evidenceId params). Old entries still pass a stored `url`.
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../../constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";
import { getEvidenceUrl } from "../../../hooks/useCasesApi";
import { SignedUrlFetcher, openEvidence } from "../../../utils/evidenceDownload";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) as string | undefined;

export default function EvidenceViewerScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).evidenceViewer;
  const params = useLocalSearchParams();

  const legacyUrl = one(params.url as any);
  const caseId = one(params.caseId as any);
  const evidenceId = one(params.evidenceId as any);
  const type = one(params.type as any) as "image" | "document" | undefined;
  const name = one(params.name as any);

  const fetcher: SignedUrlFetcher | null =
    caseId && evidenceId
      ? (d) => getEvidenceUrl(caseId, evidenceId, d)
      : legacyUrl
        ? async () => ({ url: legacyUrl, expiresIn: 0, fileName: name || "evidence", contentType: "" })
        : null;

  const [url, setUrl] = useState<string | null>(legacyUrl ?? null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [retried, setRetried] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadUrl = useCallback(async () => {
    if (!caseId || !evidenceId) return;
    setUrlError(null);
    try {
      const res = await getEvidenceUrl(caseId, evidenceId, "inline");
      setUrl(res.url);
    } catch (e: any) {
      setUrlError(e?.message || S.couldNotLoad);
    }
  }, [caseId, evidenceId, S.couldNotLoad]);

  useEffect(() => {
    setImgError(false);
    setImgLoading(true);
    setRetried(false);
    if (caseId && evidenceId) {
      setUrl(null);
      loadUrl();
    } else {
      setUrl(legacyUrl ?? null);
    }
  }, [caseId, evidenceId, legacyUrl, loadUrl]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/src/Admin/CasesScreen" as any));

  const openExternally = async (mode: "view" | "download" = "view") => {
    if (!fetcher || busy) return;
    setBusy(true);
    try {
      await openEvidence(fetcher, mode);
    } catch (e: any) {
      Alert.alert("Error", e?.message || S.couldNotLoad);
    } finally {
      setBusy(false);
    }
  };

  const missing = !fetcher || (!!urlError && !url);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {name || "Evidence"}
        </Text>
        <TouchableOpacity onPress={() => openExternally("download")} style={styles.backBtn} disabled={!fetcher || busy}>
          {busy ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="download-outline" size={22} color={Colors.primary} />}
        </TouchableOpacity>
      </View>

      {missing ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.text }]}>{urlError || S.notFound}</Text>
          {!!urlError && (
            <TouchableOpacity style={styles.openBtn} onPress={loadUrl}>
              <Text style={styles.openBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : !url ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : type === "image" ? (
        <View style={styles.imageWrap}>
          {imgLoading && !imgError && (
            <ActivityIndicator size="large" color={Colors.primary} style={StyleSheet.absoluteFill} />
          )}
          {imgError ? (
            <View style={styles.center}>
              <Text style={[styles.errorText, { color: "#FFFFFF" }]}>{S.couldNotLoad}</Text>
              <TouchableOpacity style={styles.openBtn} onPress={() => openExternally("view")}>
                <Text style={styles.openBtnText}>{S.openInBrowser}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
              onLoadEnd={() => setImgLoading(false)}
              onError={() => {
                // Presigned link may have expired: get a fresh one once.
                if (caseId && evidenceId && !retried) {
                  setRetried(true);
                  setUrl(null);
                  loadUrl();
                  return;
                }
                setImgLoading(false);
                setImgError(true);
              }}
            />
          )}
        </View>
      ) : (
        // PDF / document — device ke browser ya PDF viewer mein kholte hain
        <View style={styles.center}>
          <Text style={styles.docIcon}>📄</Text>
          <Text style={[styles.docName, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.docSub, { color: colors.subText }]}>
            {S.docHint}
          </Text>
          <TouchableOpacity style={styles.openBtn} onPress={() => openExternally("view")} disabled={busy}>
            <Text style={styles.openBtnText}>{S.openDocument}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.openBtn, styles.secondaryBtn]} onPress={() => openExternally("download")} disabled={busy}>
            <Text style={[styles.openBtnText, { color: Colors.primary }]}>Download</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: Colors.primary, fontWeight: "600" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "700" },
  imageWrap: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" },
  image: { flex: 1, width: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  errorText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  docIcon: { fontSize: 56, marginBottom: 4 },
  docName: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  docSub: { fontSize: 12, textAlign: "center", marginBottom: 8 },
  openBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 8,
  },
  openBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  secondaryBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: Colors.primary },
});
