"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/utils/format";

/**
 * True once the component has mounted in the browser. Use this to gate any
 * render output that depends on the real clock (or other browser-only
 * state) so the first client render still matches what was statically
 * prerendered — the value then updates a tick later, which is a normal
 * post-hydration render, not a hydration comparison.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: this is the one-time SSR→client handoff the hook exists to provide.
    setMounted(true);
  }, []);
  return mounted;
}

/**
 * Live "Xh Ym left" text for a countdown that ticks down toward `expiresAt`.
 * Renders `null` until mounted (see `useMounted`) so build-time and
 * visit-time renders never disagree about "now".
 */
export function useCountdownText(expiresAt: string): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: seeds the live value right after mount, then an interval keeps it ticking.
    setText(countdown(expiresAt));
    const id = setInterval(() => setText(countdown(expiresAt)), 60000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return text;
}
