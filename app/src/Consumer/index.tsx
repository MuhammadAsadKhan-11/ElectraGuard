import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PREDICT_ENDPOINT } from "../../../constants/api";
import { TabHero } from "../../../components/AppChrome";
import ConsumerBell from "../../../components/ConsumerBell";
import { auth, db } from "../../../firebaseConfig";
import { useAppSettings } from "../../../hooks/AppSettingContext";

// ─── Types ───────────────────────────────────────────────────────
interface ConsumerData {
  consumerId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  address: string;
}

interface ConsumptionRecord {
  id: string;
  consumerId: string;
  dateRange: string;
  totalUnits: number;
  avgUnits: number;
  estimatedBill: number;
  riskScore: number;
  riskLevel?: string;
  prediction?: string;
  probability?: number;
  uploadedAt: Date;
}

interface CSVStats {
  totalUnits: number;
  avgUnits: number;
  estimatedBill: number;
  dateRange: string;
  days: number;
}

// What the ML API (electra-api /predict) returns.
interface PredictionResponse {
  riskScore: number;
  prediction: string;
  probability: number;
  riskLevel: "low" | "medium" | "high" | string;
  predictionLabel?: number;
  input?: { rowsAnalyzed: number; columnsFound: number; columnsUsed: number; usedLatestWindow: boolean };
  anomalies?: {
    days: number;
    total: number;
    mean: number;
    min: number;
    max: number;
    zeroDays: number;
    lowDays: number;
    spikeDays: number;
    notes: string[];
  };
  dailyReadings?: { label: string; value: number; flag: string | null }[];
}

const ML_TIMEOUT_MS = 120000; // Render free tier can need ~1 min to wake up
const MIN_READINGS = 26; // the trained model uses 26 daily readings
const NON_FEATURE_COLUMNS = new Set(["cons_no", "consno", "consumer_no", "consumer_id", "consumerid", "id", "flag", "label"]);

// ─── CSV Parser ───────────────────────────────────────────────────
// CSV Format:
//   Row 1  → dates as column headers  (01/01/2014, 01/02/2014, …)  [optional]
//   Row 2+ → each row = one consumer's daily unit readings
// Same rules as the ML API: header detected automatically, CONS_NO/FLAG
// columns ignored, NaN / blank / negative cells counted as 0.
function parseCSV(content: string): CSVStats {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length === 0) throw new Error("The CSV file is empty.");

  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const isNum = (c: string) => c !== "" && isFinite(Number(c));
  const first = split(lines[0]);
  const hasHeader = first.some((c) => c && !isNum(c));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  if (dataLines.length === 0)
    throw new Error("The CSV has a header row but no readings. Add at least one row of daily units.");

  const skip = new Set<number>();
  if (hasHeader) {
    first.forEach((h, i) => {
      if (NON_FEATURE_COLUMNS.has(h.toLowerCase().replace(/ /g, "_"))) skip.add(i);
    });
  }
  const dateHeaders = hasHeader ? first.filter((h, i) => h && !skip.has(i)) : [];

  const positiveValues: number[] = [];
  let cells = 0;
  let invalid = 0;
  let minLen = Infinity;
  for (const line of dataLines) {
    const cols = split(line).filter((_, i) => !skip.has(i));
    while (cols.length && cols[cols.length - 1] === "") cols.pop();
    minLen = Math.min(minLen, cols.length);
    for (const col of cols) {
      cells += 1;
      const val = col === "" ? 0 : Number(col);
      if (col !== "" && !isFinite(val)) invalid += 1;
      if (isFinite(val) && val > 0) positiveValues.push(val);
    }
  }

  if (cells === 0) throw new Error("No readings were found in the CSV.");
  if (invalid > cells / 2)
    throw new Error("Most cells are not numbers. Each row must contain daily kWh readings.");
  if (minLen < MIN_READINGS)
    throw new Error(
      `Each row needs at least ${MIN_READINGS} daily readings for the AI model (found ${minLen}).`,
    );
  if (positiveValues.length === 0)
    throw new Error("No valid unit data found in CSV.");

  const total = positiveValues.reduce((sum, v) => sum + v, 0);
  const avg = total / positiveValues.length;
  const bill = total * 20;
  const firstDate = dateHeaders[0] ?? "";
  const lastDate = dateHeaders[dateHeaders.length - 1] ?? "";

  return {
    totalUnits: Math.round(total * 10) / 10,
    avgUnits: Math.round(avg * 10) / 10,
    estimatedBill: Math.round(bill),
    dateRange:
      firstDate && lastDate ? `${firstDate} – ${lastDate}` : getDateRange(),
    days: minLen,
  };
}

// Calls the ML API. Never trusts the body to be JSON (cold-start proxies return HTML).
async function runPrediction(csv: string): Promise<PredictionResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(PREDICT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ csv }),
      signal: controller.signal as any,
    });
  } catch (e: any) {
    throw new Error(
      e?.name === "AbortError"
        ? "The AI server took too long to respond. Please try again in a minute."
        : "Cannot reach the AI server. Check your internet connection.",
    );
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(
      body?.error ||
        (res.status >= 500
          ? "The AI server could not process this file. Please try again."
          : `Prediction failed (${res.status}).`),
    );
  }
  if (!body || typeof body.probability !== "number" || typeof body.riskScore !== "number") {
    throw new Error("The AI server sent an unexpected response.");
  }
  return body as PredictionResponse;
}

// Model risk band (same 0.5 / 0.8 thresholds as the ML API and admin side).
function levelOf(riskLevel: string | undefined, riskScore: number): "low" | "medium" | "high" {
  const l = (riskLevel || "").toLowerCase();
  if (l === "low" || l === "medium" || l === "high") return l;
  return riskScore >= 80 ? "high" : riskScore >= 50 ? "medium" : "low";
}

// ─── Date helpers ─────────────────────────────────────────────────
function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function getDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return `${formatDate(start)} – ${formatDate(now)}`;
}

// ─── Main Component ───────────────────────────────────────────────
export default function ConsumerDashboard() {
  const { colors, t } = useAppSettings();
  const [consumer, setConsumer] = useState<ConsumerData | null>(null);
  const [consumptions, setConsumptions] = useState<ConsumptionRecord[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvStats, setCsvStats] = useState<CSVStats | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [today] = useState(new Date());

  // ── Fetch top 10 consumptions ──────────────────────────────────
  // FIX (Firestore index error):
  //   "where + orderBy" on different fields needs a composite index.
  //   We try the optimised query first; if Firestore throws
  //   'failed-precondition' (index missing) we fall back to a
  //   simple where-only query and sort/slice client-side.
  //   Once you create the index via the Firebase Console link in
  //   the error log, the fast path will work automatically.
  const fetchConsumptions = useCallback(async (consumerId: string) => {
    try {
      // ── Optimised path (requires composite index) ──
      try {
        const q = query(
          collection(db, "consumptions"),
          where("consumerId", "==", consumerId),
          orderBy("uploadedAt", "desc"),
          limit(10),
        );
        const snap = await getDocs(q);
        const records: ConsumptionRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ConsumptionRecord, "id">),
          uploadedAt: d.data().uploadedAt?.toDate?.() ?? new Date(),
        }));
        setConsumptions(records);
        return;
      } catch (indexErr: any) {
        const isIndexMissing =
          indexErr?.code === "failed-precondition" ||
          (indexErr?.message ?? "").includes("index");
        if (!isIndexMissing) throw indexErr; // unexpected error
        console.warn(
          "Composite index missing — falling back to client-side sort.",
        );
      }

      // ── Fallback path (no index needed) ──
      const fallbackSnap = await getDocs(
        query(
          collection(db, "consumptions"),
          where("consumerId", "==", consumerId),
        ),
      );
      const all: ConsumptionRecord[] = fallbackSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ConsumptionRecord, "id">),
        uploadedAt: d.data().uploadedAt?.toDate?.() ?? new Date(),
      }));
      all.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      setConsumptions(all.slice(0, 10));
    } catch (e) {
      console.error("Error fetching consumptions:", e);
    }
  }, []);

  // ── Fetch consumer data ────────────────────────────────────────
  const fetchConsumerData = useCallback(
    async (uid: string, email: string | null) => {
      try {
        const docSnap = await getDoc(doc(db, "consumers", uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as ConsumerData;
          setConsumer(data);
          await fetchConsumptions(data.consumerId);
          return;
        }
        if (email) {
          const q = query(
            collection(db, "consumers"),
            where("email", "==", email),
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data() as ConsumerData;
            setConsumer(data);
            await fetchConsumptions(data.consumerId);
            return;
          }
        }
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as ConsumerData;
          setConsumer(data);
          await fetchConsumptions(data.consumerId ?? uid);
          return;
        }
        console.warn("No consumer document found for uid:", uid);
      } catch (e) {
        console.error("Error fetching consumer:", e);
      }
    },
    [fetchConsumptions],
  );

  // ── Auth listener ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/src/screens/LoginScreen");
        return;
      }
      setLoading(true);
      await fetchConsumerData(user.uid, user.email);
      setLoading(false);
    });
    return unsub;
  }, [fetchConsumerData]);

  // ── Refresh ───────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (consumer) await fetchConsumptions(consumer.consumerId);
    setRefreshing(false);
  }, [consumer, fetchConsumptions]);

  // ── Pick CSV ──────────────────────────────────────────────────
  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "application/csv",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file.name.toLowerCase().endsWith(".csv")) {
        Alert.alert("Invalid File", "Please select a CSV file.");
        return;
      }
      const response = await fetch(file.uri);
      const text = await response.text();
      const stats = parseCSV(text);
      setCsvFileName(file.name);
      setCsvContent(text);
      setCsvStats(stats);
    } catch (e: any) {
      setCsvFileName(null);
      setCsvContent("");
      setCsvStats(null);
      Alert.alert("Invalid CSV", e.message || "Failed to read CSV file.");
    }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!csvStats || !consumer) {
      Alert.alert("No File", "Please select a CSV file first.");
      return;
    }
    setSubmitting(true);
    setSubmitStage("Analysing your consumption with the AI model…");
    const slow = setTimeout(
      () => setSubmitStage("Waking up the AI server — this can take up to a minute…"),
      8000,
    );
    try {
      // Step 1: real model inference (electra-api /predict)
      const prediction = await runPrediction(csvContent);
      const riskScore = prediction.riskScore;
      const riskLevel = levelOf(prediction.riskLevel, riskScore);

      // Step 2: save the result (failure here must not hide the result)
      setSubmitStage("Saving result…");
      let consumptionId = "";
      try {
        const docRef = await addDoc(collection(db, "consumptions"), {
          consumerId: consumer.consumerId,
          consumerName: consumer.fullName,
          email: consumer.email,
          uid: auth.currentUser?.uid ?? null,
          dateRange: csvStats.dateRange,
          totalUnits: csvStats.totalUnits,
          avgUnits: csvStats.avgUnits,
          estimatedBill: csvStats.estimatedBill,
          riskScore,
          riskLevel,
          probability: prediction.probability,
          prediction: prediction.prediction,
          anomalies: prediction.anomalies ?? null,
          dailyReadings: prediction.dailyReadings ?? [],
          modelInput: prediction.input ?? null,
          csvRaw: csvContent,
          uploadedAt: new Date(),
        });
        consumptionId = docRef.id;
      } catch (saveErr: any) {
        console.warn("Saving consumption failed:", saveErr?.code || saveErr?.message);
        Alert.alert(
          "Result not saved",
          "The AI result is shown, but it could not be saved to your history. Check your connection.",
        );
      }

      // Step 3: show the actual model output
      router.push({
        pathname: "/src/Consumer/DetectionResultScreen" as any,
        params: {
          consumptionId,
          totalUnits: String(csvStats.totalUnits),
          avgUnits: String(csvStats.avgUnits),
          estimatedBill: String(csvStats.estimatedBill),
          riskScore: String(riskScore),
          riskLevel,
          probability: String(prediction.probability),
          prediction: prediction.prediction,
          dateRange: csvStats.dateRange,
          result: JSON.stringify({
            anomalies: prediction.anomalies ?? null,
            dailyReadings: prediction.dailyReadings ?? [],
            input: prediction.input ?? null,
          }),
        },
      });

      setCsvFileName(null);
      setCsvStats(null);
      setCsvContent("");
      await fetchConsumptions(consumer.consumerId);
    } catch (e: any) {
      Alert.alert("Detection failed", e.message || "Failed to submit. Try again.");
    } finally {
      clearTimeout(slow);
      setSubmitting(false);
      setSubmitStage("");
    }
  };

  // ── Risk color ────────────────────────────────────────────────
  // Same bands as the model: < 50 low, 50–79 medium, >= 80 high.
  const riskColor = (score: number, level?: string) => {
    const l = levelOf(level, score);
    return l === "low" ? "#34C759" : l === "medium" ? "#FF9500" : "#FF3B30";
  };

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  const firstName = consumer?.fullName?.split(" ")[0] ?? "—";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3C5D" />
      <TabHero
        title={`Welcome back, ${firstName}`}
        subtitle={`ID ${consumer?.consumerId ?? "—"}  •  Active`}
        right={<ConsumerBell />}
      >
        <Text style={styles.dateText}>
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </TabHero>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Date Range Pill ── */}
        <View style={styles.dateRangePill}>
          <Ionicons name="calendar-outline" size={14} color="#111111" />
          <Text style={styles.dateRangeText}>
            {csvStats?.dateRange ?? getDateRange()}
          </Text>
        </View>

        {/* ── CSV Upload ── */}
        <Text style={styles.sectionTitle}>Enter CSV File</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={handlePickCSV}
          activeOpacity={0.8}
        >
          {csvFileName ? (
            <View style={styles.fileSelectedContainer}>
              <Ionicons name="document-text" size={32} color="#111111" />
              <Text style={styles.fileSelectedName} numberOfLines={1}>
                {csvFileName}
              </Text>
              <Text style={styles.fileSelectedSub}>Tap to change file</Text>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={36} color="#8E8E93" />
              <Text style={styles.uploadTitle}>Upload CSV File</Text>
              <Text style={styles.uploadSub}>Daily kWh readings, at least {MIN_READINGS} days per row</Text>
              <View style={styles.selectBtn}>
                <Ionicons name="folder-outline" size={14} color="#FFFFFF" />
                <Text style={styles.selectBtnText}>Select File</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            {
              label: "Total Units",
              value: csvStats?.totalUnits ?? 0,
              unit: "kWh",
            },
            { label: "Avg.", value: csvStats?.avgUnits ?? 0, unit: "kWh" },
            {
              label: "Est. Bill",
              value: csvStats?.estimatedBill ?? 0,
              unit: "PKR",
            },
          ].map(({ label, value, unit }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statUnit}>{unit}</Text>
            </View>
          ))}
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Units</Text>
          )}
        </TouchableOpacity>
        {!!submitStage && <Text style={styles.stageText}>{submitStage}</Text>}

        {/* ── Recent Consumptions ── */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Consumptions</Text>
        </View>

        {consumptions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="analytics-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No consumption data yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recentScroll}
          >
            {consumptions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentCard}
                onPress={() =>
                  router.push({
                    pathname: "/src/Consumer/DetectionResultScreen" as any,
                    params: {
                      consumptionId: item.id,
                      totalUnits: String(item.totalUnits),
                      avgUnits: String(item.avgUnits),
                      estimatedBill: String(item.estimatedBill),
                      riskScore: String(item.riskScore),
                      riskLevel: item.riskLevel ?? "",
                      probability: item.probability != null ? String(item.probability) : "",
                      prediction: item.prediction ?? "",
                      dateRange: item.dateRange,
                    },
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.recentDateRange}>{item.dateRange}</Text>
                <Text style={styles.recentUnits}>
                  {item.totalUnits}{" "}
                  <Text style={styles.recentUnitLabel}>kWh</Text>
                </Text>
                <View
                  style={[
                    styles.riskBadge,
                    { backgroundColor: riskColor(item.riskScore, item.riskLevel) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.riskBadgeText,
                      { color: riskColor(item.riskScore, item.riskLevel) },
                    ]}
                  >
                    Risk {item.riskScore}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* ── Chatbot FAB ── */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => router.push("/src/Consumer/ChatbotScreen" as any)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open AI assistant chat"
        hitSlop={8}
      >
        <Ionicons name="help-circle" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2F2F7" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110 },
  headerCard: {
    backgroundColor: "#007AFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  headerTop: { marginBottom: 12 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoImg: { width: 36, height: 36 },
  logoText: { fontFamily: "Poppins_700Bold", fontSize: 18, color: "#FFFFFF" },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  idText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#E5E5EA" },
  activeBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#34C759",
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#E5E5EA",
    marginTop: 10,
  },
  dateRangePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F1FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  dateRangeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#111111",
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#111111",
    marginBottom: 12,
  },
  uploadBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 140,
    justifyContent: "center",
  },
  uploadPlaceholder: { alignItems: "center", gap: 6 },
  uploadTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
  },
  uploadSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#8E8E93" },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 10,
  },
  selectBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#111111",
  },
  fileSelectedContainer: { alignItems: "center", gap: 8 },
  fileSelectedName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#111111",
    maxWidth: 260,
    textAlign: "center",
  },
  fileSelectedSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8E8E93",
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statValue: { fontFamily: "Poppins_700Bold", fontSize: 20, color: "#007AFF" },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#8E8E93",
    textAlign: "center",
  },
  statUnit: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#8E8E93" },
  submitBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  stageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: -18,
    marginBottom: 24,
  },
  submitBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentScroll: { marginHorizontal: -20, paddingLeft: 20 },
  recentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    width: 160,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  recentDateRange: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#8E8E93",
    marginBottom: 6,
  },
  recentUnits: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#111111",
  },
  recentUnitLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
  },
  riskBadge: {
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  riskBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#8E8E93" },
  chatFab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
