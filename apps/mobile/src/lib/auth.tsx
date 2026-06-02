import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setTokens, clearTokens, getAccessToken } from "./api";
import { registerForPush, unregisterPush } from "./push";

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: string;
  walletAddress?: string | null;
  country?: string | null;
  kycVerified?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;      // true during the initial token bootstrap
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: if a token is on the device, hydrate the user from /me.
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const me = await api.get<User>("/api/auth/me");
          setUser(me);
          if (me.role === "LANDOWNER") registerForPush();   // best-effort, non-blocking
        }
      } catch {
        await clearTokens();   // stale/invalid token
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>("/api/auth/login", { email, password });
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    if (data.user.role === "LANDOWNER") registerForPush();   // best-effort, non-blocking
    return data.user;
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPush();   // drop this device's token while the JWT is still valid
    await clearTokens();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await api.get<User>("/api/auth/me");
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
