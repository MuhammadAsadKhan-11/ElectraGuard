import { FieldValue } from 'firebase/firestore';

// ── Consumer document (/consumers/{uid}) ──────────────────────────────────────
export interface Consumer {
  uid:               string;
  fullName:          string;
  consumerId:        string;        // e.g. "C-10045"
  cnicNumber:        string;        // e.g. "12345-1234567-1"
  email:             string;
  mobileNumber:      string;
  role:              'consumer';
  isVerified:        boolean;
  lastVerifiedAt:    number | null; // ms timestamp — used for 1-week OTP window
  loginOtp:          string | null; // cleared after successful login verify
  loginOtpExpiresAt: number | null; // cleared after successful login verify
  resetOtp:          string | null; // cleared after successful password reset
  resetOtpExpiresAt: number | null; // cleared after successful password reset
  createdAt:         FieldValue | Date;

  // ❌ REMOVED — never store passwords in Firestore
  // passwordHash:    string;
  // passwordEncoded: string;
}

// ── Admin document (/admins/{uid}) ────────────────────────────────────────────
export interface Admin {
  uid:               string;
  email:             string;
  adminId?:          string;
  role:              'admin';
  isVerified:        boolean;
  lastVerifiedAt:    number | null;
  loginOtp:          string | null;
  loginOtpExpiresAt: number | null;
  resetOtp:          string | null;
  resetOtpExpiresAt: number | null;
}