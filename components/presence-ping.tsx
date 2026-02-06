"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

const PING_INTERVAL_MS = 60_000;

export function PresencePing() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (pathname === "/login") return;

    let mounted = true;

    const ping = async () => {
      try {
        await fetch("/api/presence", { method: "POST" });
      } catch {
        // ignore network errors
      }
    };

    const handleVisibility = () => {
      if (!mounted) return;
      if (document.visibilityState === "visible") {
        void ping();
      }
    };

    void ping();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void ping();
      }
    }, PING_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pathname]);

  return null;
}
