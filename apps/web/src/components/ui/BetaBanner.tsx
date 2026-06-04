"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Dismissible site-wide notice that the platform is in beta and the data shown
 * is for demonstration only. Dismissal is remembered in localStorage so it
 * doesn't nag on every page load.
 */
const STORAGE_KEY = "kabon-beta-dismissed";

export default function BetaBanner() {
  // Start hidden to avoid a hydration flash; reveal after we read localStorage.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== "1") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-amber-500 text-amber-950" role="status">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm">
        <span className="font-semibold uppercase tracking-wide">Beta</span>
        <p className="flex-1">
          This platform is in active development. Projects and data shown are for
          demonstration purposes only. No real carbon credits are being sold yet.
        </p>
        <button
          type="button"
          aria-label="Dismiss notice"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setVisible(false);
          }}
          className="shrink-0 rounded p-1 transition-colors hover:bg-amber-600/30"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
