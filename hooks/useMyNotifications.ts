// hooks/useMyNotifications.ts
// Consumer app ke liye — sirf iss logged-in consumer ki apni notifications
// (case filed / case closed / case escalated waghera) backend se laata hai.
import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { API_BASE_URL } from "../constants/api";

async function authedFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    throw new Error((body as any).detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export interface MyNotification {
  id: string;
  type: "case_filed" | "case_closed" | "case_escalated" | "alert" | string;
  title: string;
  message: string;
  caseId?: string;
  read: boolean;
  createdAt: string;
}

// Backend endpoint: GET /api/consumers/me/notifications
// (consumer apna Firebase idToken bhejta hai, backend usi se uid nikal ke
// notifications/{uid} ka data return karta hai — /api/cases* endpoints ke
// saath is backend ke doosre half mein banega)
export function useMyNotifications() {
  const [items, setItems] = useState<MyNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoaded(false);
    setError(null);
    try {
      const res = await authedFetch("/api/consumers/me/notifications");
      setItems(res.items ?? res ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load notifications");
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (ids: string[]) => {
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      await authedFetch("/api/consumers/me/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // silent — UI already updated optimistically
    }
  }, []);

  const unread = items.filter((n) => !n.read).length;

  return {
    items,
    unread,
    loaded,
    error,
    refresh: () => load(true),
    refreshing,
    markRead,
    markAllRead: () => markRead(items.filter((n) => !n.read).map((n) => n.id)),
  };
}
