"use client";
import { api } from "./api";

export function setToken(token: string) {
  localStorage.setItem("ca_token", token);
}

export function clearToken() {
  localStorage.removeItem("ca_token");
  localStorage.removeItem("ca_user");
}

export function setUser(user: unknown) {
  localStorage.setItem("ca_user", JSON.stringify(user));
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("ca_user");
  return raw ? JSON.parse(raw) : null;
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
