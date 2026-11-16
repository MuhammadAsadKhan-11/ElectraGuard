// One place for every backend the app talks to.
// Set these in .env or in eas.json. Empty or placeholder values fall through
// to the deployed services so local, preview, and production builds agree.

const LIVE_ADMIN_API = "https://adminbackendapi-3y0m.onrender.com";
const LIVE_ML_API = "https://electra-api-2.onrender.com";
const LIVE_CHATBOT_API = "https://electraguard-backend-1.onrender.com";

function clean(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed || trimmed.includes("YOUR-BACKEND-URL")) return "";
  return trimmed;
}

export const API_BASE_URL =
  clean(process.env.EXPO_PUBLIC_API_URL) ||
  clean(process.env.EXPO_PUBLIC_API_BASE_URL) ||
  LIVE_ADMIN_API;

export const ML_API_URL =
  clean(process.env.EXPO_PUBLIC_ML_URL) || LIVE_ML_API;

export const CHATBOT_API_URL =
  clean(process.env.EXPO_PUBLIC_CHATBOT_URL) || LIVE_CHATBOT_API;

export const PREDICT_ENDPOINT = `${ML_API_URL}/predict`;
export const CHAT_ENDPOINT = `${CHATBOT_API_URL}/chat`;
