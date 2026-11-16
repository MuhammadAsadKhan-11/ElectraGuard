// hooks/useMyCase.ts
// Consumer view of ONE of their own cases (opened from a notification).
// The backend returns 404 unless the case belongs to the signed-in consumer.
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./apiClient";
import type { SignedUrl } from "../utils/evidenceDownload";

export interface MyCaseEvidence {
  id: string;
  name: string;
  fileName?: string;
  type: "image" | "document";
  category?: string;
  fileType?: string;
  extension?: string;
  size?: number;
  uploadedAt?: string | null;
  uploadedBy?: string | null;
  date?: string | null;
  downloadable?: boolean;
}

export interface MyCase {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  area: string;
  inspectorAssigned: boolean;
  inspector?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  timeline: { action: string; date: string; time: string }[];
  remarks: { message: string; at?: string | null }[];
  evidence: MyCaseEvidence[];
}

export function getMyEvidenceUrl(
  caseDocId: string,
  evidenceId: string,
  disposition: "attachment" | "inline",
): Promise<SignedUrl> {
  return apiFetch<SignedUrl>(
    `/api/consumers/me/cases/${encodeURIComponent(caseDocId)}/evidence/${encodeURIComponent(evidenceId)}/url?disposition=${disposition}`,
  );
}

export function useMyCase(caseDocId: string | null | undefined) {
  const [data, setData] = useState<MyCase | null>(null);
  const [loading, setLoading] = useState<boolean>(!!caseDocId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseDocId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<MyCase>(`/api/consumers/me/cases/${encodeURIComponent(caseDocId)}`));
    } catch (e: any) {
      setData(null);
      setError(e?.message || "Could not load the case.");
    } finally {
      setLoading(false);
    }
  }, [caseDocId]);

  useEffect(() => {
    load();
  }, [load]);

  return { caseItem: data, loading, error, reload: load };
}
