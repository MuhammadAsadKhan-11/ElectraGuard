// hooks/useAlertsApi.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiClient";

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertDTO {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** ISO 8601 in UTC, e.g. "2026-09-29T04:15:00Z" */
  createdAt: string;
}

export interface AlertsResponse {
  activeCount: number;
  alerts: AlertDTO[];
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    const id = ++reqId.current;
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AlertsResponse>("/api/alerts");
      if (id === reqId.current) {
        const list = res?.alerts ?? [];
        setAlerts(list);
        setActiveCount(res?.activeCount ?? list.length);
      }
    } catch (e: any) {
      if (id === reqId.current) setError(e?.message ?? "Could not load alerts.");
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load("initial");
  }, [load]);

  return {
    alerts,
    activeCount,
    loading,
    refreshing,
    error,
    reload: () => load("initial"),
    pullRefresh: () => load("refresh"),
  };
}
