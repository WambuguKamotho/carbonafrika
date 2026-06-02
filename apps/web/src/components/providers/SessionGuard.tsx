"use client";
import { useIdleLogout } from "@/hooks/useIdleLogout";

export default function SessionGuard() {
  useIdleLogout();
  return null;
}
