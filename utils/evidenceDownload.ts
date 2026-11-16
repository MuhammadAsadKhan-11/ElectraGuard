// utils/evidenceDownload.ts
// Opens or downloads an evidence file through a short-lived presigned URL.
// A NEW authorised URL is requested from the backend on every tap, so an
// expired link is never reused; the backend checks the caller owns the case.
//
// - "download": URL is signed with Content-Disposition: attachment + the real
//   file name and MIME type, so the system downloader saves a valid PDF / DOCX /
//   XLSX / image (with its own progress notification on Android).
// - "view": URL is signed inline and opened in the in-app browser (PDF/images).
import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";

export interface SignedUrl {
  url: string;
  expiresIn: number;
  fileName: string;
  contentType: string;
}

export type SignedUrlFetcher = (disposition: "attachment" | "inline") => Promise<SignedUrl>;

export async function openEvidence(fetchUrl: SignedUrlFetcher, mode: "view" | "download"): Promise<SignedUrl> {
  const signed = await fetchUrl(mode === "view" ? "inline" : "attachment");
  if (!signed?.url) throw new Error("The server did not return a download link.");

  if (Platform.OS === "web") {
    const g = globalThis as any; // DOM only exists in the web build
    if (mode === "download") {
      const a = g.document.createElement("a");
      a.href = signed.url;
      a.download = signed.fileName || "evidence";
      a.rel = "noopener";
      g.document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      g.open(signed.url, "_blank", "noopener");
    }
    return signed;
  }

  if (mode === "view") {
    await WebBrowser.openBrowserAsync(signed.url);
  } else {
    const ok = await Linking.canOpenURL(signed.url).catch(() => true);
    if (!ok) throw new Error("No app on this device can open the download link.");
    await Linking.openURL(signed.url);
  }
  return signed;
}

export function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function fileIcon(category?: string, ext?: string): string {
  const e = (ext || "").toLowerCase();
  if (category === "image") return "image-outline";
  if (e === "pdf") return "document-text-outline";
  if (category === "spreadsheet" || e === "xls" || e === "xlsx" || e === "csv") return "grid-outline";
  return "document-outline";
}
