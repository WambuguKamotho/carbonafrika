"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL = 30_000;

export function useNotifications(loggedIn: boolean) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const res = await api.get<{ data: AppNotification[] }>("/api/notifications");
      const list = res.data ?? [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {
      // silently ignore — bell stays as-is if the request fails
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetch();
    timerRef.current = setInterval(fetch, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loggedIn, fetch]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/api/notifications/read-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, refresh: fetch };
}
