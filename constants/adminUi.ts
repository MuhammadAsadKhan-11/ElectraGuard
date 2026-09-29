// constants/adminUi.ts
// Admin screens (Dashboard / Risks / ConsumerProfile) ke shared colors aur helpers.

export const palette = {
  primary: "#0B3C5D",
  accent: "#007AFF", // normal consumption (blue line)
  danger: "#FF3B30", // theft (red line)
  warning: "#FF9500",
  success: "#34C759",
  teal: "#1CA7A6",
  white: "#FFFFFF",
};

export const riskColor = (level: string): string => {
  const l = (level || "").toLowerCase();
  if (l === "high") return palette.danger;
  if (l === "medium") return palette.warning;
  return palette.success;
};

export const severityColor = (severity: string): string => {
  const s = (severity || "").toLowerCase();
  if (s === "high") return palette.danger;
  if (s === "medium") return palette.warning;
  return palette.primary;
};

const RESOLVED = ["resolved", "closed", "completed", "done"];

export const caseStatusColor = (status: string): string => {
  const s = (status || "").toLowerCase();
  if (RESOLVED.includes(s)) return palette.teal;
  if (s.includes("progress") || s.includes("review") || s.includes("investigat") || s.includes("pending"))
    return palette.warning;
  return palette.danger; // Open / Escalated / unknown
};

export const formatNumber = (n: number, digits = 0): string =>
  Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: digits });

/** Chart ke y-axis ke liye "gol" upper bound (e.g. 437 -> 500). */
export const niceCeil = (v: number): number => {
  if (!isFinite(v) || v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
};

/** ISO time => "just now", "5 min ago", "3 h ago", "2 d ago", warna "07 May 2026". */
export const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  if (sec < 86400 * 7) return `${Math.round(sec / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
