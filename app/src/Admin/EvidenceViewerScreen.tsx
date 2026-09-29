// app/src/Admin/EvidenceViewerScreen.tsx
// Case Profile ke Evidence list mein kisi item par tap karne se yeh screen khulti hai.
// Image ho to seedha dikhati hai; PDF/document ho to device ke default viewer mein
// (ya browser mein) khol deti hai, jaisa ConsumerProfileScreen mein links khulte hain.
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../../constants/Colors";
import { useAppSettings } from "../../../hooks/AppSettingContext";
import { getStrings } from "../../../constants/caseScreensStrings";

export default function EvidenceViewerScreen() {
  const router = useRouter();
  const { colors, language } = useAppSettings();
  const S = getStrings(language).evidenceViewer;
  const params = useLocalSearchParams();

  const url = (Array.isArray(params.url) ? params.url[0] : params.url) as string | undefined;
  const type = (Array.isArray(params.type) ? params.type[0] : params.type) as
    | "image"
    | "document"
    | undefined;
  const name = (Array.isArray(params.name) ? params.name[0] : params.name) as string | undefined;

  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/src/Admin/CasesScreen" as any));

  const openExternally = () => {
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {name || "Evidence"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!url ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.text }]}>{S.notFound}</Text>
        </View>
      ) : type === "image" ? (
        <View style={styles.imageWrap}>
          {imgLoading && !imgError && (
            <ActivityIndicator size="large" color={Colors.primary} style={StyleSheet.absoluteFill} />
          )}
          {imgError ? (
            <View style={styles.center}>
              <Text style={[styles.errorText, { color: colors.text }]}>{S.couldNotLoad}</Text>
              <TouchableOpacity style={styles.openBtn} onPress={openExternally}>
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
          <TouchableOpacity style={styles.openBtn} onPress={openExternally}>
            <Text style={styles.openBtnText}>{S.openDocument}</Text>
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
    marginTop: 40,
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
  openBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
