// Consumer notifications. One shared store so the bell badge, the list and the
// detail screen always agree.
// - Real-time: Firestore listener on consumerNotifications WHERE recipientUid == my uid
//   (the only shape the security rules allow), so admin actions show up instantly.
// - Fallback: if the listener is refused, the backend API is polled every 20s.
// - Read/unread is written through the backend (it checks ownership).
// - Cleared on logout / account switch so one consumer never sees another's items.
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { apiFetch, apiPostJson } from "./apiClient";
import { onSessionReset } from "./authSession";

export interface NotificationEvidence {
  id: string;
  name: string;
  category?: string;
  fileType?: string;
  size?: number;
}

export interface MyNotification {
  id: string;
  type:
    | "case_created"
    | "case_assigned"
    | "case_status_changed"
    | "evidence_uploaded"
    | "case_escalated"
    | "case_closed"
    | "case_remark"
    | "admin_message"
    | string;
  title: string;
  message: string;
  caseId?: string | null; // case number shown to people (e.g. CASE123456)
  caseDocId?: string | null; // id used by the case endpoints
  caseTitle?: string | null;
  caseStatus?: string | null;
  evidence: NotificationEvidence[];
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NState {
  uid: string | null;
  items: MyNotification[];
  loaded: boolean;
  error: string | null;
  refreshing: boolean;
}

const EMPTY: NState = { uid: null, items: [], loaded: false, error: null, refreshing: false };
let state: NState = { ...EMPTY };
const subs = new Set<() => void>();
let unsubAuth: (() => void) | null = null;
let unsubSnap: (() => void) | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const emit = () => subs.forEach((fn) => fn());
const setState = (patch: Partial<NState>) => {
  state = { ...state, ...patch };
  emit();
};

const clearPoll = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
};

function isoOf(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return "";
}

function fromDoc(id: string, data: Record<string, any>): MyNotification {
  return {
    id,
    type: String(data.type || "alert"),
    title: String(data.title || ""),
    message: String(data.message || ""),
    caseId: data.caseId ? String(data.caseId) : null,
    caseDocId: data.caseDocId ? String(data.caseDocId) : null,
    caseTitle: data.caseTitle ? String(data.caseTitle) : null,
    caseStatus: data.caseStatus ? String(data.caseStatus) : null,
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    read: Boolean(data.read),
    readAt: isoOf(data.readAt) || null,
    createdAt: isoOf(data.createdAt),
  };
}

const sortNewest = (items: MyNotification[]) =>
  [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

async function loadFromApi(): Promise<void> {
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) return;
  setState({ refreshing: true });
  try {
    const json = await apiFetch<{ items: MyNotification[] }>("/api/consumers/me/notifications");
    if (auth.currentUser?.uid !== uid) return; // account changed meanwhile
    setState({
      uid,
      items: sortNewest((json?.items ?? []).map((n) => ({ ...n, evidence: n.evidence ?? [] }))),
      loaded: true,
      error: null,
    });
  } catch (e: any) {
    if (auth.currentUser?.uid !== uid) return;
    setState({ loaded: true, error: e?.message || "Failed to load notifications" });
  } finally {
    setState({ refreshing: false });
  }
}

function watchUser(uid: string) {
  unsubSnap?.();
  clearPoll();
  const q = query(collection(db, "consumerNotifications"), where("recipientUid", "==", uid));
  unsubSnap = onSnapshot(
    q,
    (snap) => {
      clearPoll();
      if (auth.currentUser?.uid !== uid) return;
      setState({
        uid,
        items: sortNewest(snap.docs.map((d) => fromDoc(d.id, d.data()))),
        loaded: true,
        error: null,
      });
    },
    () => {
      // Listener refused (rules/offline): poll the backend instead.
      loadFromApi();
      if (!pollTimer) pollTimer = setInterval(loadFromApi, 20000);
    },
  );
}

function resetStore() {
  clearPoll();
  unsubSnap?.();
  unsubSnap = null;
  setState({ ...EMPTY });
}

onSessionReset(resetStore);

function start() {
  if (unsubAuth) return;
  unsubAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      resetStore();
      setState({ loaded: true });
      return;
    }
    if (state.uid !== user.uid) {
      resetStore();
      setState({ uid: user.uid });
    }
    watchUser(user.uid);
  });
}

function stop() {
  unsubAuth?.();
  unsubAuth = null;
  resetStore();
}

async function markRead(ids: string[]) {
  const unreadIds = ids.filter((id) => state.items.some((n) => n.id === id && !n.read));
  if (!unreadIds.length) return;
  const set = new Set(unreadIds);
  const before = state.items;
  setState({ items: state.items.map((n) => (set.has(n.id) ? { ...n, read: true } : n)) });
  try {
    await apiPostJson("/api/consumers/me/notifications/mark-read", { ids: unreadIds });
  } catch (e: any) {
    // keep the server as the source of truth: roll back and surface the error
    setState({ items: before, error: e?.message || "Could not update notification" });
  }
}

async function markAllRead() {
  if (!state.items.some((n) => !n.read)) return;
  const before = state.items;
  setState({ items: state.items.map((n) => ({ ...n, read: true })) });
  try {
    await apiPostJson("/api/consumers/me/notifications/mark-read", { markAll: true });
  } catch (e: any) {
    setState({ items: before, error: e?.message || "Could not update notifications" });
    throw e;
  }
}

export function useMyNotifications() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    if (subs.size === 1) start();
    return () => {
      subs.delete(fn);
      if (subs.size === 0) stop();
    };
  }, []);

  const mark = useCallback((ids: string[]) => markRead(ids), []);
  const unread = state.items.filter((n) => !n.read).length;

  return {
    items: state.items,
    unread,
    loaded: state.loaded,
    error: state.error,
    refresh: loadFromApi,
    refreshing: state.refreshing,
    markRead: mark,
    markAllRead,
    getById: (id: string) => state.items.find((n) => n.id === id),
  };
}
