// hooks/useAdminApi.ts
// FastAPI backend se data lene ke liye hooks + response types.
// Base URL: constants/api.ts (EXPO_PUBLIC_API_URL, then the deployed admin API).
import { onAuthStateChanged } from "firebase/auth";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { API_BASE_URL } from "../constants/api";
import { auth, db } from "../firebaseConfig";
import { ApiError as ClientApiError, apiFetch, getAuthToken } from "./apiClient";
import { onSessionReset } from "./authSession";

export { API_BASE_URL };

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
// FETCH HELPERS — thin wrappers over hooks/apiClient.ts (one auth/timeout path)
// ─────────────────────────────────────────────────────────────
type Params = Record<string, string | number | null | undefined>;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const rethrow = (e: unknown): never => {
  if (e instanceof ClientApiError) throw new ApiError(e.status ?? 0, e.message);
  throw e;
};

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const qs = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  try {
    return await apiFetch<T>(`${path}${qs ? `?${qs}` : ""}`);
  } catch (e) {
    return rethrow(e);
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return rethrow(e);
  }
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

  // Account switch => drop the previous account's data and load again.
  useEffect(() => {
    let lastUid = auth.currentUser?.uid ?? null;
    return onAuthStateChanged(auth, (user) => {
      const uid = user?.uid ?? null;
      if (uid === lastUid) return;
      lastUid = uid;
      setData(null);
      setError(null);
      if (uid) load("initial");
    });
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
  const token = await getAuthToken();
  if (!liveRunning || gen !== liveGen) return;
  if (!token) {
    // not signed in (yet): try again shortly instead of opening an unauthenticated socket
    liveRetryTimer = setTimeout(() => connectLive(gen), 5000);
    return;
  }

  const wsUrl =
    API_BASE_URL.replace(/^http/, "ws") +
    "/ws/updates" +
    `?token=${encodeURIComponent(token)}`;

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

const EMPTY_N: NState = { items: [], unread: 0, loaded: false, error: null };
let nState: NState = EMPTY_N;
const nSubs = new Set<() => void>();
let nUnsubLive: (() => void) | null = null;
let nUnsubCases: (() => void) | null = null;
let nFetching = false;
let nQueued = false;

const setNState = (patch: Partial<NState>) => {
  nState = { ...nState, ...patch };
  nRenderSubs.forEach((fn) => fn());
};

// Logout / account switch: forget the previous admin's notifications and any
// in-flight fetch flag, and restart the socket with the new account's token.
onSessionReset(() => {
  nFetching = false;
  nQueued = false;
  setNState({ ...EMPTY_N });
  if (liveRunning) {
    stopLive();
    if (liveListeners.size > 0) startLive();
  }
});

// Bumped by every read action: a fetch that started before it carries stale
// read/unread flags, so its result is thrown away and the fetch is redone.
let nGen = 0;

export async function refreshNotifications(): Promise<void> {
  try {
    await auth.authStateReady(); // after an app reload the session is restored asynchronously
  } catch {
    // ignore
  }
  if (!auth.currentUser) {
    setNState({ loaded: true });
    return;
  }
  if (nFetching) {
    nQueued = true; // fetch ke dauran naya event aaya => ek aur baar fetch
    return;
  }
  nFetching = true;
  const gen = nGen;
  try {
    const res = await apiGet<NotificationsResponse>("/api/notifications", { limit: 50 });
    if (gen !== nGen) {
      nQueued = true; // a read action happened meanwhile: this response is outdated
    } else {
      setNState({ items: res.items, unread: res.unreadCount, loaded: true, error: null });
    }
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
  nGen += 1;
  const set = new Set(ids);
  const dec = nState.items.filter((n) => set.has(n.id) && !n.read).length;
  setNState({
    items: nState.items.map((n) => (set.has(n.id) ? { ...n, read: true } : n)),
    unread: Math.max(0, nState.unread - dec),
  });
  try {
    await apiPost("/api/notifications/read", { ids });
  } finally {
    nGen += 1;
    refreshNotifications();
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  nGen += 1;
  const before = { items: nState.items, unread: nState.unread };
  setNState({ items: nState.items.map((n) => ({ ...n, read: true })), unread: 0, error: null });
  try {
    await apiPost("/api/notifications/read", { markAll: true });
  } catch (e: any) {
    setNState({ ...before, error: e?.message ?? "Could not mark notifications as read" });
    throw e;
  }
  nGen += 1; // anything fetched before the server saved "read all" is outdated
  await refreshNotifications();
}

// Re-render subscription (useSyncExternalStore). Kept separate from the
// lifecycle counter below, which starts/stops the live listeners.
const nRenderSubs = new Set<() => void>();
const subscribeNState = (fn: () => void) => {
  nRenderSubs.add(fn);
  return () => {
    nRenderSubs.delete(fn);
  };
};
const getNState = () => nState;

export function useNotifications() {
  // useSyncExternalStore (not a force-update counter): the React Compiler used by
  // this project memoised the old pattern, so screens kept showing stale
  // unread/loading values after "Read all" or a reload.
  const snap = useSyncExternalStore(subscribeNState, getNState, getNState);

  useEffect(() => {
    const fn = () => {};
    nSubs.add(fn);
    if (nSubs.size === 1) {
      nUnsubLive = subscribeLive(refreshNotifications);
      const newestCase = query(collection(db, "cases"), orderBy("updatedAt", "desc"), limit(1));
      nUnsubCases = onSnapshot(
        newestCase,
        () => {
          refreshNotifications();
        },
        () => {
          nUnsubCases?.();
          nUnsubCases = null;
        },
      );
      refreshNotifications();
    } else if (!nState.loaded) {
      refreshNotifications();
    }
    return () => {
      nSubs.delete(fn);
      if (nSubs.size === 0) {
        nUnsubLive?.();
        nUnsubLive = null;
        nUnsubCases?.();
        nUnsubCases = null;
      }
    };
  }, []);

  return {
    items: snap.items,
    unread: snap.unread,
    loaded: snap.loaded,
    error: snap.error,
    refresh: refreshNotifications,
    markRead: markNotificationsRead,
    markAllRead: markAllNotificationsRead,
  };
}
