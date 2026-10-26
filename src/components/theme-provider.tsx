"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

if (typeof window !== "undefined") {
  // Auto-reload on ChunkLoadError or Turbopack stale chunk mismatch
  window.addEventListener("error", (e) => {
    const msg = e.message || (e.error && e.error.message) || "";
    if (/ChunkLoadError|Loading chunk .* failed|Failed to load chunk|enqueueModel is not a function/i.test(msg)) {
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 3000) {
        sessionStorage.setItem("last_chunk_reload", String(now));
        window.location.reload();
      }
    }
  });

  if (process.env.NODE_ENV === "development") {
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
        return;
      }
      origError.apply(console, args);
    };
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}