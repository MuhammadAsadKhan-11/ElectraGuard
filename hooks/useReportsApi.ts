// hooks/useReportsApi.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiClient";

export type ReportPeriod = "7d" | "30d" | "3m";

export interface StatDTO {
  value: number;
  /** % change vs previous period (can be negative) */
  changePct: number;
}

export type InsightType = "alert" | "success" | "savings" | "info";

export interface InsightDTO {
  id: string;
  type: InsightType;
  title: string;
  subtitle: string;
}

export interface ReportsSummaryDTO {
  period: ReportPeriod;
  stats: {
    totalCases: StatDTO;
    revenueLoss: StatDTO; // PKR
    detectionRate: StatDTO; // percent 0-100
    avgResponseHours: StatDTO; // hours
  };
  /** counts per risk level (frontend converts to percentages) */
  riskDistribution: { low: number; medium: number; high: number };
  areaTheft: { area: string; cases: number }[];
  revenueLossByArea: { area: string; amount: number }[];
  insights: InsightDTO[];
}

export function useReportsSummary(period: ReportPeriod) {
  const [data, setData] = useState<ReportsSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      const id = ++reqId.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<ReportsSummaryDTO>(
          `/api/reports/summary?period=${period}`,
        );
        if (id === reqId.current) setData(res);
      } catch (e: any) {
        if (id === reqId.current) {
          setError(e?.message ?? "Could not load reports.");
        }
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period],
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => load("initial"),
    pullRefresh: () => load("refresh"),
  };
}

/** Downloads the report as CSV text (used by the Export button). */
export const fetchReportCsv = (period: ReportPeriod) =>
  apiFetch<string>(
    `/api/reports/export?period=${period}&format=csv`,
    { headers: { Accept: "text/csv" } },
    { as: "text" },
  );
