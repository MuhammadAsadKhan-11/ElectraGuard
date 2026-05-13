// OTP is stored directly on the Consumer/Admin document — NOT a separate collection.
// This type describes the OTP fields embedded in Consumer and Admin interfaces.

export type OTPPurpose = 'login' | 'passwordReset';

export interface EmbeddedOTP {
  otp:       string | null; // plaintext — stored temporarily, cleared after use
  expiresAt: number | null; // Date.now() + 10 min in ms
  purpose:   OTPPurpose;
}

// ── What gets written to Firestore on OTP generation ─────────────────────────
export interface LoginOTPUpdate {
  loginOtp:          string | null;
  loginOtpExpiresAt: number | null;
  isVerified:        boolean;
  lastVerifiedAt:    number | null;
}

export interface ResetOTPUpdate {
  resetOtp:          string | null;
  resetOtpExpiresAt: number | null;
}