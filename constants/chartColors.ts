// constants/chartColors.ts
// ONE place for analytics colors (Admin Dashboard + Reports).
// Colors are always looked up by category / series name — never by array index —
// so they stay the same whatever order, filter or subset of data a chart gets.
import { palette } from "./adminUi";

export type RiskLevel = "low" | "medium" | "high";

export const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high"] as const;

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#22C55E", // green
  medium: "#F59E0B", // orange
  high: "#EF4444", // red
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

/** "LOW" / "Low" / " low " -> "low". Anything else -> null (never silently "low"). */
export function normalizeRiskLevel(value: unknown): RiskLevel | null {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "low" || v === "medium" || v === "high" ? v : null;
}

export const CONSUMPTION_CHART_COLORS = {
  normal: palette.accent, // unchanged existing "normal consumption" blue
  theft: "#EF4444", // theft / suspected theft is always red
} as const;

export const CONSUMPTION_SERIES_LABELS = {
  normal: "Normal consumption",
  theft: "Theft",
} as const;

/** Whole-number percentages that always add up to 100 (largest-remainder rounding). */
export function roundedPercents<K extends string>(counts: Record<K, number>, keys: readonly K[]): Record<K, number> {
  const total = keys.reduce((s, k) => s + Math.max(0, counts[k] || 0), 0);
  const out = {} as Record<K, number>;
  if (total <= 0) {
    keys.forEach((k) => (out[k] = 0));
    return out;
  }
  const raw = keys.map((k) => ({ k, exact: (Math.max(0, counts[k] || 0) / total) * 100 }));
  raw.forEach((r) => (out[r.k] = Math.floor(r.exact)));
  let left = 100 - raw.reduce((s, r) => s + Math.floor(r.exact), 0);
  [...raw]
    .sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))
    .forEach((r) => {
      if (left > 0 && r.exact > 0) {
        out[r.k] += 1;
        left -= 1;
      }
    });
  return out;
}
