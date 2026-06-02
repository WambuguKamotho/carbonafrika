"use client";
import { api } from "./api";

export function setToken(token: string) {
  sessionStorage.setItem("ca_token", token);
  // Session cookie (no max-age) — browser drops it when all tabs are closed
  document.cookie = `ca_token=${token}; path=/; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // sessionStorage is tab-specific; fall back to the session cookie so new
  // tabs and direct URL navigation work without requiring a fresh login.
  return (
    sessionStorage.getItem("ca_token") ??
    document.cookie.match(/(?:^|;\s*)ca_token=([^;]+)/)?.[1] ??
    null
  );
}

export function clearToken() {
  sessionStorage.removeItem("ca_token");
  localStorage.removeItem("ca_user");
  document.cookie = "ca_token=; path=/; max-age=0";
}

export function setUser(user: unknown) {
  // localStorage so user data is shared across tabs within the same browser session.
  // The session cookie (no max-age) is the actual auth guard — it disappears when
  // the browser fully closes, and clearToken() wipes it on logout/idle timeout.
  localStorage.setItem("ca_user", JSON.stringify(user));
}

export function getUser() {
  if (typeof window === "undefined") return null;
  // If the session cookie is gone (browser restarted), treat as logged out
  // and clean up any stale localStorage entry.
  if (!document.cookie.includes("ca_token=")) {
    localStorage.removeItem("ca_user");
    return null;
  }
  const raw = localStorage.getItem("ca_user");
  return raw ? JSON.parse(raw) : null;
}

// Role helpers — keep admin-page guards consistent.
// ADMIN and VIEWER both see the admin UI; VIEWER is read-only.
export function isAdminLike(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "VIEWER";
}
export function isReadOnly(role: string | null | undefined): boolean {
  return role === "VIEWER";
}

export async function loginWithEmail(email: string, password: string) {
  const res = await api.post<{ data: { accessToken: string; user: unknown } }>(
    "/api/auth/login",
    { email, password }
  );
  setToken(res.data.accessToken);
  setUser(res.data.user);
  return res.data;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  country?: string;
}) {
  const res = await api.post<{ data: { accessToken: string; user: unknown } }>(
    "/api/auth/register",
    data
  );
  setToken(res.data.accessToken);
  setUser(res.data.user);
  return res.data;
}

export async function fetchMe() {
  const res = await api.get<{ data: Record<string, unknown> }>("/api/auth/me");
  setUser(res.data);
  return res.data;
}

export async function loginWithWallet(address: string, signMessage: (msg: string) => Promise<string>) {
  const nonceRes = await api.post<{ data: { message: string } }>(
    "/api/auth/wallet/nonce",
    { address }
  );

  const signature = await signMessage(nonceRes.data.message);

  const res = await api.post<{ data: { accessToken: string; user: unknown } }>(
    "/api/auth/wallet/verify",
    { address, signature }
  );
  setToken(res.data.accessToken);
  setUser(res.data.user);
  return res.data;
}
