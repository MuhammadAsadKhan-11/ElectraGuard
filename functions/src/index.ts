import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "asadkhans2310861@gmail.com",        // Apni app Gmail daalo
    pass: "tyme nzuf czku mslo", // Gmail App Password daalo
  },
});

// ─── Send OTP ────────────────────────────────────────────────
export const sendAdminOTP = functions.https.onCall(async (data) => {
  const { email } = data;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  await admin.firestore().collection("adminOTPs").doc(email).set({
    otp,
    expiresAt,
  });

  await transporter.sendMail({
    from: "ElectraGuard <yourapp@gmail.com>",
    to: email,
    subject: "ElectraGuard Admin OTP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:20px">
        <h2 style="color:#0B3C5D">ElectraGuard Admin Login</h2>
        <p>Your verification code is:</p>
        <h1 style="color:#0B3C5D;letter-spacing:10px;font-size:40px;margin:20px 0">${otp}</h1>
        <p>This code expires in <b>5 minutes</b>.</p>
        <p style="color:#999;font-size:12px">Do not share this code with anyone.</p>
      </div>
    `,
  });

  return { success: true };
});

// ─── Verify OTP ──────────────────────────────────────────────
export const verifyAdminOTP = functions.https.onCall(async (data) => {
  const { email, otp } = data;

  const docRef = admin.firestore().collection("adminOTPs").doc(email);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { success: false, message: "OTP not found. Please login again." };
  }

  const savedData = doc.data()!;

  if (Date.now() > savedData.expiresAt) {
    await docRef.delete();
    return { success: false, message: "OTP expired. Please login again." };
  }

  if (otp !== savedData.otp) {
    return { success: false, message: "Invalid OTP. Try Again!." };
  }

  // Admin verified update karo
  const adminSnap = await admin.firestore()
    .collection("admins")
    .where("email", "==", email)
    .get();

  const batch = admin.firestore().batch();
  adminSnap.forEach((d) => batch.update(d.ref, { verified: true }));
  await batch.commit();

  await docRef.delete();

  return { success: true };
});