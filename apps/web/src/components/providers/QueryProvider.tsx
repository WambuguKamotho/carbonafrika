"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 5s is short enough that admin actions reflect quickly on user dashboards
        // while still giving us a tiny cache hit on rapid navigation.
        staleTime: 5_000,
        retry: 1,
        // Force a refetch whenever the tab regains focus, even if the data
        // is still "fresh". Critical for the admin → landowner approval flow
        // where the landowner needs to see the status flip immediately after
        // they alt-tab back to their dashboard.
        refetchOnWindowFocus: "always",
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
