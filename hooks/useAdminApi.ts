// hooks/useAdminApi.ts
// FastAPI backend se data lene ke liye hooks + response types.
//
// .env (Expo) mai set karo:
//   EXPO_PUBLIC_API_URL=http://192.168.1.10:8000      (LAN IP / deployed URL)
//   Android emulator => http://10.0.2.2:8000 | iOS simulator => http://localhost:8000
import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../firebaseConfig";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000"
).replace(/\/+$/, "");

// ─────────────────────────────────────────────────────────────
// TYPES  (backend schemas.py se match karte hain)
// ─────────────────────────────────────────────────────────────
export interface DashboardKPIs {
  totalConsumers: number;
  totalConsumptionKwh: number;
  consumptionScopeLabel: string;
  consumptionChangePct: number | null;
  activeMembers: number;
  registeredCount: number;
  activePct: number;
  highRiskConsumers: number;
  highRiskPct: number;
  theftCases: number;
  revenueLoss: number;
  revenueLossFormatted: string;
  casesResolved: number;
  casesResolvedChangePct: number | null;
  tariffPkrPerKwh: number;
}

export interface ChartPoint {
  date: string;
  label: string;
  normal: number;
  theft: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  chart: {
    points: ChartPoint[];
    spikeRatio: number | null;
    windowStart: string;
    windowEnd: string;
  };
  generatedAt: string;
}

export interface ConsumerSummary {
  id: string;
  consumerId: string;
  name: string;
  meterNumber: string;
  location: string;
  riskScore: number;
  riskLevel: "High" | "Medium" | "Low";
  consumption: number;
  anomaly: number;
  status: string;
}

export interface RiskListResponse {
  total: number;
  counts: Record<string, number>;
  items: ConsumerSummary[];
}

export interface ConsumerProfile extends ConsumerSummary {
  email: string;
  phone: string;
  cnic: string;
  address: string;
  lastReading: string | null;
  prediction: string;
  estimatedBill: number;
  dateRange: string;
  consumptionHistory: { date: string; label: string; value: number }[];
  theftFlags: { type: string; date: string; severity: string }[];
  cases: {
    id: string;
    caseNumber: string;
    description: string;
    status: string;
    createdAt: string;
  }[];
}

// ─────────────────────────────────────────────────────────────
// AUTH TOKEN
// ─────────────────────────────────────────────────────────────
const getIdToken = (): Promise<string | null> => {
  if (auth.currentUser) {
    return auth.currentUser.getIdToken().catch(() => null);
  }
  // App start par Firebase session restore hone tak intezar (max 5s)
  return new Promise((resolve) => {
    let done = false;
    let unsub: (() => void) | undefined;
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsub?.();
      resolve(token);
    };
    const timer = setTimeout(() => finish(null), 5000);
    unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        finish(null);
        return;
      }
      user
        .getIdToken()
        .then(finish)
        .catch(() => finish(null));
    });
    if (done) unsub?.();
  });
};

// ─────────────────────────────────────────────────────────────
// FETCH HELPER
// ─────────────────────────────────────────────────────────────
type Params = Record<string, string | number | null | undefined>;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const token = await getIdToken();
  const qs = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText || "Request failed";
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // body JSON nahi tha
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// ─────────────────────────────────────────────────────────────
// POST helper (notifications read/unread ke liye)
// ─────────────────────────────────────────────────────────────
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText || "Request failed";
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      // body JSON nahi tha
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// ─────────────────────────────────────────────────────────────
// useApi — data + loading + error + refresh
// ─────────────────────────────────────────────────────────────
type LoadMode = "initial" | "silent" | "pull";

export function useApi<T>(path: string | null, params?: Params) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = JSON.stringify(params ?? {});
  const reqId = useRef(0);

  const load = useCallback(
    async (mode: LoadMode = "initial") => {
      if (!path) {
        setLoading(false);
        return;
      }
      const id = ++reqId.current;
      if (mode === "initial") setLoading(true);
      if (mode === "pull") setRefreshing(true);
      try {
        const res = await apiGet<T>(path, params);
        if (id !== reqId.current) return; // naya request aa chuka hai
        setData(res);
        setError(null);
      } catch (e: any) {
        if (id !== reqId.current) return;
        setError(e?.message ?? "Request failed");
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, paramsKey],
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  // unmount ke baad aane wale responses ignore karo
  useEffect(() => {
    return () => {
      reqId.current += 1;
    };
  }, []);

  const reload = useCallback(() => load("silent"), [load]);
  const pullRefresh = useCallback(() => load("pull"), [load]);
  const retry = useCallback(() => load("initial"), [load]);

  return { data, loading, refreshing, error, reload, pullRefresh, retry };
}

// ─────────────────────────────────────────────────────────────
// LIVE BUS — poori app ke liye EK hi WebSocket (sab screens/bells share karti hain).
// Backend Firestore change par {"type":"refresh"} bhejta hai; WebSocket band ho to har 60s polling.
// ─────────────────────────────────────────────────────────────
type Listener = () => void;

const liveListeners = new Set<Listener>();
let liveSocket: WebSocket | null = null;
let liveRunning = false;
let liveGen = 0;
let liveAttempt = 0;
let liveRetryTimer: ReturnType<typeof setTimeout> | undefined;
let livePollTimer: ReturnType<typeof setInterval> | undefined;

const emitLive = () => {
  liveListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ek listener ki error baaqi ko na roke
    }
  });
};

const connectLive = async (gen: number) => {
  if (!liveRunning || gen !== liveGen) return;
  const token = await getIdToken();
  if (!liveRunning || gen !== liveGen) return;

  const wsUrl =
    API_BASE_URL.replace(/^http/, "ws") +
    "/ws/updates" +
    (token ? `?token=${encodeURIComponent(token)}` : "");

  const ws = new WebSocket(wsUrl);
  liveSocket = ws;
  ws.onopen = () => {
    liveAttempt = 0;
    emitLive(); // reconnect ke baad jo miss hua wo le lo
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg?.type === "refresh") emitLive();
    } catch {
      // pong / non-JSON message
    }
  };
  ws.onerror = () => {
    ws.close();
  };
  ws.onclose = () => {
    if (liveSocket === ws) liveSocket = null;
    if (!liveRunning || gen !== liveGen) return;
    liveAttempt = Math.min(liveAttempt + 1, 6);
    liveRetryTimer = setTimeout(() => connectLive(gen), Math.min(1000 * 2 ** liveAttempt, 30000));
  };
};

const startLive = () => {
  if (liveRunning) return;
  liveRunning = true;
  liveGen += 1;
  liveAttempt = 0;
  connectLive(liveGen);
  livePollTimer = setInterval(emitLive, 60000);
};

const stopLive = () => {
  liveRunning = false;
  liveGen += 1;
  if (liveRetryTimer) clearTimeout(liveRetryTimer);
  if (livePollTimer) clearInterval(livePollTimer);
  liveSocket?.close();
  liveSocket = null;
};

export function subscribeLive(fn: Listener): () => void {
  liveListeners.add(fn);
  if (liveListeners.size === 1) startLive();
  return () => {
    liveListeners.delete(fn);
    if (liveListeners.size === 0) stopLive();
  };
}

export function useLiveRefresh(onRefresh: () => void, enabled: boolean = true) {
  const cb = useRef(onRefresh);
  useEffect(() => {
    cb.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeLive(() => cb.current());
  }, [enabled]);
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS — shared store (bell + notifications screen ek hi data dekhte hain)
// ─────────────────────────────────────────────────────────────
export type NotificationType =
  | "case_filed"
  | "case_escalated"
  | "case_resolved"
  | "theft_detected"
  | "query"
  | "alert";

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  severity: "high" | "medium" | "low" | "info" | string;
  createdAt: string | null;
  read: boolean;
  consumerName: string;
  consumerId: string;
  consumerKey: string | null;
  caseId: string | null;
}

interface NotificationsResponse {
  unreadCount: number;
  total: number;
  items: AppNotification[];
}

interface NState {
  items: AppNotification[];
  unread: number;
  loaded: boolean;
  error: string | null;
}

let nState: NState = { items: [], unread: 0, loaded: false, error: null };
const nSubs = new Set<() => void>();
let nUnsubLive: (() => void) | null = null;
let nFetching = false;
let nQueued = false;

const setNState = (patch: Partial<NState>) => {
  nState = { ...nState, ...patch };
  nSubs.forEach((fn) => fn());
};

export async function refreshNotifications(): Promise<void> {
  if (nFetching) {
    nQueued = true; // fetch ke dauran naya event aaya => ek aur baar fetch
    return;
  }
  nFetching = true;
  try {
    const res = await apiGet<NotificationsResponse>("/api/notifications", { limit: 50 });
    setNState({ items: res.items, unread: res.unreadCount, loaded: true, error: null });
  } catch (e: any) {
    setNState({ error: e?.message ?? "Request failed", loaded: true });
  } finally {
    nFetching = false;
    if (nQueued) {
      nQueued = false;
      refreshNotifications();
    }
  }
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const set = new Set(ids);
  const dec = nState.items.filter((n) => set.has(n.id) && !n.read).length;
  setNState({
    items: nState.items.map((n) => (set.has(n.id) ? { ...n, read: true } : n)),
    unread: Math.max(0, nState.unread - dec),
  });
  try {
    await apiPost("/api/notifications/read", { ids });
  } finally {
    refreshNotifications();
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  setNState({ items: nState.items.map((n) => ({ ...n, read: true })), unread: 0 });
  try {
    await apiPost("/api/notifications/read", { markAll: true });
  } finally {
    refreshNotifications();
  }
}

export function useNotifications() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    nSubs.add(fn);
    if (nSubs.size === 1) {
      nUnsubLive = subscribeLive(refreshNotifications);
      refreshNotifications();
    } else if (!nState.loaded) {
      refreshNotifications();
    }
    return () => {
      nSubs.delete(fn);
      if (nSubs.size === 0 && nUnsubLive) {
        nUnsubLive();
        nUnsubLive = null;
      }
    };
  }, []);

  return {
    items: nState.items,
    unread: nState.unread,
    loaded: nState.loaded,
    error: nState.error,
    refresh: refreshNotifications,
    markRead: markNotificationsRead,
    markAllRead: markAllNotificationsRead,
  };
}
