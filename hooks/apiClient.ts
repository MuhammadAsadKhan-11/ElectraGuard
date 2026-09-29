// hooks/apiClient.ts
// Small shared fetch helper for the FastAPI backend.
// - Base URL comes from EXPO_PUBLIC_API_URL (.env)
// - Sends the Firebase ID token as "Authorization: Bearer <token>" when logged in
// - 15s timeout + friendly error messages
import { auth } from "../firebaseConfig";

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; as?: "json" | "text" } = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError("EXPO_PUBLIC_API_URL is not set in your .env file.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    };

    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // continue without a token; the server decides if that's allowed
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        if (typeof body?.detail === "string") detail = body.detail;
      } catch {
        // ignore body parse errors
      }
      throw new ApiError(detail || `Request failed (${res.status}).`, res.status);
    }

    return (opts.as === "text" ? await res.text() : await res.json()) as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    if (e?.name === "AbortError") {
      throw new ApiError("The server took too long to respond. Please try again.");
    }
    throw new ApiError(
      "Cannot reach the server. Check that the backend is running and your phone is on the same network.",
    );
  } finally {
    clearTimeout(timer);
  }
}
