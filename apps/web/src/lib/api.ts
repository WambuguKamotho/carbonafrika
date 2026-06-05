// Must read from the SAME places lib/auth.ts writes the token:
// sessionStorage (per-tab) with a session cookie fallback (cross-tab, same browser session).
// Reading localStorage here is a bug — the token is never stored there, so every request
// would go without Authorization and the 401 handler below would log the user straight out.
function getToken() {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem("ca_token") ??
    document.cookie.match(/(?:^|;\s*)ca_token=([^;]+)/)?.[1] ??
    null
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // A 401 on an authenticated request means the session expired → bounce to login.
    // But 401s from the credential endpoints (login, wallet verify, invite, reset)
    // are real "invalid credentials" errors — let them surface to the form instead
    // of mislabelling them "Session expired" and redirecting.
    const isCredentialEndpoint =
      path.startsWith("/api/auth/login") ||
      path.startsWith("/api/auth/register") ||
      path.startsWith("/api/auth/wallet") ||
      path.startsWith("/api/auth/forgot-password") ||
      path.startsWith("/api/auth/reset-password") ||
      path.startsWith("/api/auth/redeem-invite");
    if (res.status === 401 && !isCredentialEndpoint && typeof window !== "undefined") {
      sessionStorage.removeItem("ca_token");
      localStorage.removeItem("ca_user");
      document.cookie = "ca_token=; path=/; max-age=0";
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      throw new Error("Session expired");
    }
    let message = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      message = formatServerError(j) ?? message;
    } catch { /* non-JSON body */ }
    // Surface in dev so failures aren't invisible if the UI swallows the toast.
    if (typeof window !== "undefined") console.error(`[api] ${path} → ${res.status}`, message);
    throw new Error(message);
  }
  return res.json();
}

/**
 * Normalise the variety of error shapes our backend hands back into a single
 * human-readable string. Zod's `.flatten()` returns a structured object — we
 * need to flatten that further so users see "methodologyCode: Required" instead
 * of "[object Object]".
 */
function formatServerError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  // Server templates: { success: false, error: string | ZodFlattened, message?: string }
  if (typeof b.message === "string") return b.message;
  const err = b.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const parts: string[] = [];
    if (Array.isArray(e.formErrors)) parts.push(...e.formErrors);
    if (e.fieldErrors) {
      for (const [field, msgs] of Object.entries(e.fieldErrors)) {
        if (Array.isArray(msgs) && msgs.length) parts.push(`${field}: ${msgs.join(", ")}`);
      }
    }
    if (parts.length) return parts.join(" · ");
  }
  return null;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
