"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

/**
 * Keeps the screen live. Polls a tiny "has anything changed?" endpoint every
 * couple of seconds; when the answer changes it re-renders the server page and
 * revalidates every SWR query on screen, so stock levels, bill totals, money
 * received and reports update without a manual reload. Pauses while the tab is
 * hidden and checks immediately when it comes back.
 *
 * `version` is the fingerprint the server saw when it rendered this page, so a
 * change that lands between the server render and the browser starting this
 * component (slow phones, busy networks) is still caught.
 */
export function LiveRefresh({ version, endpoint = "/api/live", intervalMs = 2500 }: { version: string; endpoint?: string; intervalMs?: number }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const last = useRef<string>(version);

  // A server re-render brings a fresh baseline.
  useEffect(() => {
    last.current = version;
  }, [version]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;

    async function check() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (res.ok) {
          const { v } = (await res.json()) as { v: string };
          if (v !== last.current) {
            router.refresh();
            mutate(() => true);
          }
          last.current = v;
        }
      } catch {
        // Offline or server restarting: try again on the next tick.
      } finally {
        inFlight = false;
      }
    }

    function loop() {
      timer = setTimeout(async () => {
        await check();
        if (!stopped) loop();
      }, intervalMs);
    }

    const onVisible = () => {
      if (!document.hidden) check();
    };
    check();
    loop();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endpoint, intervalMs, router, mutate]);

  return null;
}
