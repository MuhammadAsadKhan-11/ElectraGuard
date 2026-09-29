// constants/api.ts
// Backend ka base URL. .env / app.config mein EXPO_PUBLIC_API_BASE_URL set kar dein,
// warna neeche wala placeholder use hoga jo aap Render/Railway pe deploy karne ke
// baad apne asal URL se replace kar dein (jaise "https://electraguard-api.onrender.com").
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://YOUR-BACKEND-URL.onrender.com";
