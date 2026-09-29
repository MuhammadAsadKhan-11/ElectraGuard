// hooks/useCasesApi.ts
// Cases ka data, ab RTDB ki jagah seedha FastAPI backend (Firestore) se aata hai —
// yehi backend jo ConsumerProfileScreen aur notifications.tsx pehle se use kar rahe hain.
// NOTE: /api/cases* endpoints backend ke "doosre half" mein add honge — yeh file
// unhi endpoints ko call karti hai (contract neeche comments mein hai).
import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { API_BASE_URL } from "../constants/api";
import { useLiveRefresh } from "./useAdminApi";

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

export type CaseStatus = "Open" | "In Progress" | "Closed" | "Rejected";
export type RiskLevelStr = "Low" | "Medium" | "High" | "Critical";

export interface CaseSummaryDTO {
  id: string;
  caseNumber: string;
  consumerId: string;
  consumerName: string;
  area: string;
  status: CaseStatus;
  riskLevel: RiskLevelStr;
  category: string;
  description: string;
  inspector: string | null;
  createdAt: string;
  evidences: number;
}

export interface TimelineEntryDTO {
  action: string;
  date: string;
  time: string;
}

export interface EvidenceItemDTO {
  name: string;
  type: "image" | "document";
  url: string;
  uploadedBy?: string;
  date?: string;
}

export interface CaseDetailDTO extends CaseSummaryDTO {
  timeline: TimelineEntryDTO[];
  evidence: EvidenceItemDTO[];
  priority: string;
  meterNumber?: string;
}

export interface CasesListResponse {
  total: number;
  counts: Record<CaseStatus, number>;
  items: CaseSummaryDTO[];
}

// ── List + live status counts ──────────────────────────────────
export function useCasesList(status?: CaseStatus | "All", search?: string) {
  const [data, setData] = useState<CasesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (status && status !== "All") qs.set("status", status);
        if (search) qs.set("search", search);
        const res = await authedFetch(`/api/cases?${qs.toString()}`);
        setData(res);
      } catch (e: any) {
        setError(e.message || "Failed to load cases");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, search],
  );

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true), true);

  return {
    cases: data?.items ?? [],
    counts: data?.counts ?? ({} as Record<CaseStatus, number>),
    total: data?.total ?? 0,
    loading,
    refreshing,
    error,
    reload: () => load(false),
    pullRefresh: () => load(true),
  };
}

// ── Single case (profile) ──────────────────────────────────────
export function useCaseDetail(caseId: string | null) {
  const [data, setData] = useState<CaseDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!caseId) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const res = await authedFetch(`/api/cases/${encodeURIComponent(caseId)}`);
        setData(res);
      } catch (e: any) {
        setError(e.message || "Failed to load case");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [caseId],
  );

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true), !!caseId);

  return {
    caseItem: data,
    loading,
    refreshing,
    error,
    reload: () => load(false),
    pullRefresh: () => load(true),
  };
}

// ── Mutations ───────────────────────────────────────────────────
interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

function buildFormData(fields: Record<string, string>, files: PickedFile[]) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  files.forEach((f) => {
    // @ts-ignore React Native FormData file shape
    fd.append("files", {
      uri: f.uri,
      name: f.name,
      type: f.mimeType || "application/octet-stream",
    });
  });
  return fd;
}

export async function createCase(payload: {
  consumerId: string;
  consumerName: string;
  area: string;
  riskLevel: string;
  category: string;
  description: string;
  inspector?: string;
  priority: string;
  files: PickedFile[];
}) {
  const fd = buildFormData(
    {
      consumerId: payload.consumerId,
      consumerName: payload.consumerName,
      area: payload.area,
      riskLevel: payload.riskLevel,
      category: payload.category,
      description: payload.description,
      inspector: payload.inspector || "",
      priority: payload.priority,
    },
    payload.files,
  );
  // Backend: case Firestore mein banata hai, evidence upload karta hai, AUR
  // consumer ko notification bhejta hai — sab ek hi call mein.
  return authedFetch("/api/cases", { method: "POST", body: fd as any });
}

export async function assignInspector(caseId: string, inspector: string) {
  return authedFetch(`/api/cases/${encodeURIComponent(caseId)}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inspector }),
  });
}

export async function closeCase(caseId: string) {
  // Backend case status "Closed" karta hai + consumer ko notify karta hai
  return authedFetch(`/api/cases/${encodeURIComponent(caseId)}/close`, {
    method: "POST",
  });
}

export async function escalateCase(
  caseId: string,
  payload: {
    escalationLevel: string;
    reason: string;
    description: string;
    files: PickedFile[];
  },
) {
  const fd = buildFormData(
    {
      escalationLevel: payload.escalationLevel,
      reason: payload.reason,
      description: payload.description,
    },
    payload.files,
  );
  // Backend riskLevel badhata hai, evidence save karta hai, consumer ko notify karta hai
  return authedFetch(`/api/cases/${encodeURIComponent(caseId)}/escalate`, {
    method: "POST",
    body: fd as any,
  });
}

// ── Inspectors (mockInspectors ki jagah, live list) ─────────────
export interface InspectorDTO {
  id: string;
  name: string;
  area: string;
  available: boolean;
}

export function useInspectors() {
  const [inspectors, setInspectors] = useState<InspectorDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authedFetch("/api/inspectors")
      .then((res) => setInspectors(res.items ?? res))
      .catch(() => setInspectors([]))
      .finally(() => setLoading(false));
  }, []);

  return { inspectors, loading };
}
