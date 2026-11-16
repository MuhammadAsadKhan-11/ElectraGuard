// hooks/apiClient.ts
// ONE fetch layer for the FastAPI backend (admin + consumer + auth endpoints).
// - Base URL from constants/api.ts
// - Waits for Firebase to restore the session, then sends a fresh ID token
// - On 401 the token is force-refreshed once and the call retried
//   (an expired/rotated token after logout -> login no longer breaks calls)
// - Every request has a timeout, so a stuck request can never block later ones
// - Uploads go through XHR so callers can show real upload progress
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { API_BASE_URL } from "../constants/api";
import { auth } from "../firebaseConfig";

const BASE_URL = API_BASE_URL;
// Render free instances can take ~70s to wake up.
const DEFAULT_TIMEOUT_MS = 75000;

export class ApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const isTwoFactorError = (e: unknown) =>
  e instanceof ApiError && e.code === "2fa_required";

export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  try {
    await auth.authStateReady();
  } catch {
    // older SDKs: fall through to currentUser
  }
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

let deviceIdPromise: Promise<string> | null = null;

/** Random per-install id used only for the "trusted device" 2FA window. */
export function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem("eg_device_id");
        if (saved) return saved;
      } catch {
        // storage unavailable: a fresh id just means the OTP is asked again
      }
      const id = Crypto.randomUUID();
      try {
        await AsyncStorage.setItem("eg_device_id", id);
      } catch {
        // ignore
      }
      return id;
    })();
  }
  return deviceIdPromise;
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      if (typeof body?.detail === "string") detail = body.detail;
      else if (Array.isArray(body?.detail)) detail = body.detail.map((d: any) => d?.msg).filter(Boolean).join(", ");
      else if (typeof body?.error === "string") detail = body.error;
    } catch {
      // HTML error page (proxy / cold start): keep the generic message
    }
  } catch {
    // ignore
  }
  const code = res.headers.get("x-auth-error") === "2fa_required" ? "2fa_required" : undefined;
  if (!detail) {
    detail =
      res.status === 401
        ? "Your session has expired. Please sign in again."
        : res.status === 403
          ? "You do not have access to this."
          : res.status >= 500
            ? `The server had a problem (${res.status}). Please try again.`
            : `Request failed (${res.status}).`;
  }
  return new ApiError(detail, res.status, code);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; as?: "json" | "text"; auth?: boolean } = {},
): Promise<T> {
  const useAuth = opts.auth !== false;

  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...((init.headers as Record<string, string>) ?? {}),
      };
      if (useAuth) {
        const token = await getAuthToken(forceRefresh);
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      return await fetch(`${BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new ApiError("The server took too long to respond. Please try again.", undefined, "timeout");
      }
      throw new ApiError(
        "Cannot reach the server. Check your internet connection (or that the backend is running).",
        undefined,
        "network",
      );
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await attempt(false);
  if (res.status === 401 && useAuth && auth.currentUser) {
    res = await attempt(true); // stale token -> refresh once
  }
  if (!res.ok) throw await errorFromResponse(res);
  if (opts.as === "text") return (await res.text()) as T;
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new ApiError("The server sent an unexpected response.", res.status);
  }
}

export const apiGetJson = <T,>(path: string, timeoutMs?: number) => apiFetch<T>(path, {}, { timeoutMs });

export const apiPostJson = <T,>(path: string, body: unknown, opts: { timeoutMs?: number; auth?: boolean } = {}) =>
  apiFetch<T>(
    path,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) },
    opts,
  );

/** multipart upload with progress (0..1). Do NOT set Content-Type: the boundary is added automatically. */
export async function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
  timeoutMs = 300000,
): Promise<T> {
  const send = (token: string | null) =>
    new Promise<{ status: number; text: string; authError: string | null }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}${path}`);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader("Accept", "application/json");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable && ev.total > 0) onProgress(Math.min(1, ev.loaded / ev.total));
        };
      }
      xhr.onload = () =>
        resolve({ status: xhr.status, text: xhr.responseText || "", authError: xhr.getResponseHeader("x-auth-error") });
      xhr.onerror = () => reject(new ApiError("Upload failed. Check your connection and try again.", undefined, "network"));
      xhr.ontimeout = () => reject(new ApiError("The upload took too long. Please try again.", undefined, "timeout"));
      xhr.send(form as any);
    });

  let out = await send(await getAuthToken(false));
  if (out.status === 401 && auth.currentUser) out = await send(await getAuthToken(true));
  onProgress?.(1);

  let body: any = null;
  try {
    body = out.text ? JSON.parse(out.text) : null;
  } catch {
    body = null;
  }
  if (out.status < 200 || out.status >= 300) {
    const detail =
      (typeof body?.detail === "string" && body.detail) ||
      (out.status >= 500 ? `The server had a problem (${out.status}).` : `Upload failed (${out.status}).`);
    throw new ApiError(detail, out.status, out.authError === "2fa_required" ? "2fa_required" : undefined);
  }
  return body as T;
}
