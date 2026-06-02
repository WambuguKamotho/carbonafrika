// API base URL. Set EXPO_PUBLIC_API_URL in .env (see .env.example). In dev this
// is your machine's LAN IP + the Next.js web port (3000), which already proxies
// /api/* to every microservice. In production it's the public API gateway.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://192.168.1.100:3000";

// Brand palette — mirrors the web app's forest/savanna scheme.
export const colors = {
  forest900: "#052e16",
  forest800: "#166534",
  forest700: "#15803d",
  forest600: "#16a34a",
  forest50:  "#f0fdf4",
  savanna600: "#d97706",
  ink:       "#111827",
  body:      "#374151",
  muted:     "#6b7280",
  faint:     "#9ca3af",
  line:      "#e5e7eb",
  bg:        "#f9fafb",
  white:     "#ffffff",
  red:       "#dc2626",
  yellow:    "#ca8a04",
  blue:      "#2563eb",
};
