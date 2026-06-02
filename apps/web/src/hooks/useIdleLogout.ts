"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

const IDLE_MS = 10 * 60 * 1000; // 10 minutes
const EVENTS  = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function useIdleLogout() {
  const router  = useRouter();
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function logout() {
      clearToken();
      router.push("/login");
    }

    function reset() {
      if (!getToken()) return; // not logged in — nothing to do
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MS);
    }

    // Only arm the timer when someone is actually logged in
    if (!getToken()) return;

    reset();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [router]);
}
