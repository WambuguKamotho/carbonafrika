import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

// ── Token storage (device keychain / keystore via expo-secure-store) ──────────
const ACCESS_KEY = "kabon.accessToken";
const REFRESH_KEY = "kabon.refreshToken";

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_KEY);
}
export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}
export async function setTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// Access tokens live 15 min. When one expires mid-session we silently swap it
// for a fresh one using the refresh token, so the user isn't kicked out.
// A single in-flight refresh is shared across concurrent 401s.
let refreshing: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = await getRefreshToken();
    if (!rt) return null;
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success || !j.data?.accessToken) return null;
      await SecureStore.setItemAsync(ACCESS_KEY, j.data.accessToken);
      return j.data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// ── Error shape ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// The backend returns Zod errors as { formErrors, fieldErrors } — flatten to text.
function formatError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const parts: string[] = [];
    if (e.formErrors?.length) parts.push(...e.formErrors);
    if (e.fieldErrors) for (const [k, v] of Object.entries(e.fieldErrors)) parts.push(`${k}: ${v.join(", ")}`);
    if (parts.length) return parts.join("\n");
  }
  return fallback;
}

interface ApiEnvelope<T> { success: boolean; data?: T; error?: unknown; message?: string }

const REQUEST_TIMEOUT_MS = 12_000;

async function request<T>(method: string, path: string, body?: unknown, _retried = false): Promise<T> {
  const token = await getAccessToken();
  let res: Response;
  // React Native's fetch has no built-in timeout — without this, an unreachable
  // backend hangs forever (e.g. the app stuck on the loading spinner at boot).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new ApiError(
      aborted
        ? `Server didn't respond (timed out). Is the backend running and is EXPO_PUBLIC_API_URL right? (${API_URL})`
        : `Can't reach the server. Check your connection and EXPO_PUBLIC_API_URL (${API_URL}).`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  // Expired access token → refresh once and replay the request transparently.
  if (
    res.status === 401 && !_retried &&
    !path.includes("/auth/refresh") && !path.includes("/auth/login")
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(method, path, body, true);
  }

  let json: ApiEnvelope<T> | null = null;
  try { json = (await res.json()) as ApiEnvelope<T>; } catch { /* non-JSON */ }

  if (!res.ok || !json?.success) {
    const code = typeof json?.error === "string" ? json.error : undefined;
    const msg = json?.message || formatError(json?.error, `Request failed (${res.status})`);
    throw new ApiError(msg, res.status, code);
  }
  return json.data as T;
}

export const api = {
  get:   <T>(path: string) => request<T>("GET", path),
  post:  <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};
