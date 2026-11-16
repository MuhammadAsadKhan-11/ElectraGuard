// hooks/authSession.ts
// Login 2FA + session helpers. The OTP is generated, emailed (EmailJS) and
// checked by the backend; the app never sees or stores the code.
//
// Every module that caches per-account data registers a reset function here,
// so switching Consumer <-> Admin never shows (or reuses) the previous account's state.
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { apiFetch, apiPostJson, getDeviceId } from "./apiClient";

export type PortalRole = "admin" | "consumer";

const resetters = new Set<() => void>();

export function onSessionReset(fn: () => void): () => void {
  resetters.add(fn);
  return () => {
    resetters.delete(fn);
  };
}

export function resetSessionStores() {
  resetters.forEach((fn) => {
    try {
      fn();
    } catch {
      // one bad store must not block the others
    }
  });
}

export interface OtpRequestResult {
  required: boolean;
  trustedDevice?: boolean;
  alreadySent?: boolean;
  maskedEmail?: string;
  expiresIn?: number;
  resendIn?: number;
}

export async function resolveLoginEmail(identifier: string): Promise<string> {
  const res = await apiPostJson<{ email: string }>("/api/auth/resolve-login", { identifier }, { auth: false });
  return res.email;
}

export async function requestLoginOtp(role: PortalRole, resend = false): Promise<OtpRequestResult> {
  const deviceId = await getDeviceId();
  return apiPostJson<OtpRequestResult>("/api/auth/otp/request", { role, deviceId, resend });
}

export async function verifyLoginOtp(code: string): Promise<{ verified: boolean; role: PortalRole }> {
  const deviceId = await getDeviceId();
  return apiPostJson("/api/auth/otp/verify", { code, deviceId });
}

export async function getSessionStatus(): Promise<{ verified: boolean; role: PortalRole | null }> {
  return apiFetch("/api/auth/session");
}

/** Revokes this sign-in on the backend, clears cached account data, then signs out of Firebase. */
export async function signOutEverywhere(): Promise<void> {
  if (auth.currentUser) {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" }, { timeoutMs: 8000 });
    } catch {
      // offline / server asleep: Firebase sign-out below still ends the session on this device
    }
  }
  resetSessionStores();
  await signOut(auth);
}

export interface ResetCodeResult {
  maskedEmail?: string;
  expiresIn?: number;
  resendIn?: number;
  alreadySent?: boolean;
  portal: PortalRole;
}

export async function requestResetCode(identifier: string, resend = false): Promise<ResetCodeResult> {
  return apiPostJson("/api/auth/password-reset/request", { identifier, resend }, { auth: false });
}

export async function verifyResetCode(identifier: string, code: string): Promise<{ email: string; portal: PortalRole }> {
  return apiPostJson("/api/auth/password-reset/verify", { identifier, code }, { auth: false });
}
