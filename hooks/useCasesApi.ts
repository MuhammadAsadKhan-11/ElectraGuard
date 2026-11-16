// hooks/useCasesApi.ts
// Cases ka data, ab RTDB ki jagah seedha FastAPI backend (Firestore) se aata hai —
// yehi backend jo ConsumerProfileScreen aur notifications.tsx pehle se use kar rahe hain.
// NOTE: /api/cases* endpoints backend ke "doosre half" mein add honge — yeh file
// unhi endpoints ko call karti hai (contract neeche comments mein hai).
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { apiFetch, uploadWithProgress } from "./apiClient";
import { useLiveRefresh } from "./useAdminApi";

// Shared client: fresh token, one retry on 401, timeouts, readable errors.
async function authedFetch(path: string, options: RequestInit = {}): Promise<any> {
  return apiFetch<any>(path, options);
}

// Evidence rules (mirrors the backend; the server re-checks everything).
export const EVIDENCE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"];
export const EVIDENCE_MAX_MB = 15;
export const EVIDENCE_MAX_FILES = 10;
export const EVIDENCE_PICKER_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];

/** Returns an error message for a picked file, or null when it is acceptable. */
export function checkEvidenceFile(f: { name: string; size?: number | null }): string | null {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!f.name.includes(".") || !EVIDENCE_EXTENSIONS.includes(ext)) {
    return `"${f.name}" is not a supported type. Use: ${EVIDENCE_EXTENSIONS.join(", ")}.`;
  }
  if (f.size && f.size > EVIDENCE_MAX_MB * 1024 * 1024) {
    return `"${f.name}" is larger than ${EVIDENCE_MAX_MB} MB.`;
  }
  return null;
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
  id: string;
  name: string;
  type: "image" | "document";
  url: string; // legacy entries only; S3 files use getEvidenceUrl()
  category?: string;
  fileName?: string;
  fileType?: string;
  extension?: string;
  size?: number;
  uploadedAt?: string | null;
  uploadedBy?: string;
  date?: string;
  downloadable?: boolean;
}

export interface DownloadUrlDTO {
  url: string;
  expiresIn: number;
  fileName: string;
  contentType: string;
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

async function buildFormData(fields: Record<string, string>, files: PickedFile[]) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  for (const f of files) {
    if (Platform.OS === "web") {
      // Browsers need a real Blob; the {uri,name,type} shape only works on native.
      const blob = await (await fetch(f.uri)).blob();
      (fd as any).append("files", blob, f.name);
    } else {
      // @ts-ignore React Native FormData file shape
      fd.append("files", {
        uri: f.uri,
        name: f.name,
        type: f.mimeType || "application/octet-stream",
      });
    }
  }
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
}, onProgress?: (fraction: number) => void) {
  const fd = await buildFormData(
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
  // Backend: case Firestore mein banata hai, evidence S3 par upload karta hai, AUR
  // consumer ko notification bhejta hai — sab ek hi call mein.
  return uploadWithProgress<CaseDetailDTO & { notified?: boolean }>("/api/cases", fd, onProgress);
}

export async function addEvidence(
  caseId: string,
  files: PickedFile[],
  note = "",
  onProgress?: (fraction: number) => void,
) {
  const fd = await buildFormData({ note }, files);
  return uploadWithProgress<CaseDetailDTO>(`/api/cases/${encodeURIComponent(caseId)}/evidence`, fd, onProgress);
}

export async function updateCaseStatus(caseId: string, status: CaseStatus, note = "") {
  return authedFetch(`/api/cases/${encodeURIComponent(caseId)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  });
}

export async function addCaseRemark(caseId: string, message: string, notifyConsumer = true) {
  return authedFetch(`/api/cases/${encodeURIComponent(caseId)}/remarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, notifyConsumer }),
  });
}

/** Fresh short-lived download URL for one evidence file (admin). */
export async function getEvidenceUrl(
  caseId: string,
  evidenceId: string,
  disposition: "attachment" | "inline" = "attachment",
): Promise<DownloadUrlDTO> {
  return authedFetch(
    `/api/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/url?disposition=${disposition}`,
  );
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
  onProgress?: (fraction: number) => void,
) {
  const fd = await buildFormData(
    {
      escalationLevel: payload.escalationLevel,
      reason: payload.reason,
      description: payload.description,
    },
    payload.files,
  );
  // Backend riskLevel badhata hai, evidence save karta hai, consumer ko notify karta hai
  return uploadWithProgress<CaseDetailDTO>(`/api/cases/${encodeURIComponent(caseId)}/escalate`, fd, onProgress);
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
