"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface BreadcrumbContextValue {
  label: string | null;
  setLabel: (label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const pathname = usePathname();

  // Reset any page-provided override as soon as the route changes, so a
  // stale title doesn't flash on the next page before it sets its own.
  useEffect(() => {
    setLabel(null);
  }, [pathname]);

  return (
    <BreadcrumbContext.Provider value={{ label, setLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Lets a page override the last breadcrumb segment with a real title once
 * it's loaded (e.g. a project name instead of its raw id).
 */
export function useBreadcrumbLabel(label: string | null | undefined) {
  const ctx = useContext(BreadcrumbContext);
  const lastLabel = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ctx || label === lastLabel.current) return;
    lastLabel.current = label;
    ctx.setLabel(label ?? null);
  }, [ctx, label]);
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}
