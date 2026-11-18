"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell, BellRing } from "lucide-react";
import { api, jsonFetcher } from "@/lib/client";
import { timeAgo } from "@/lib/dates";
import { cx } from "../ui";
import { BillQuickView } from "./BillQuickView";

type Notification = { id: number; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

/** Short two-tone chime generated in the browser — no audio file needed. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {}
}

function billFromLink(link: string | null) {
  const m = link?.match(/^\/bills\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function NotificationBell({ me }: { me: { id: number; manager: boolean } }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ items: Notification[]; unread: number }>("/api/notifications", jsonFetcher, {
    refreshInterval: 7000,
    revalidateOnFocus: true,
  });
  const [open, setOpen] = useState(false);
  const [quickBill, setQuickBill] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);
  const seen = useRef<number | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close the dropdown on any click outside it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Alert on anything newer than what we've already seen.
  useEffect(() => {
    if (!data) return;
    const newest = data.items[0]?.id ?? 0;
    if (seen.current !== null && newest > seen.current) {
      const fresh = data.items.filter((n) => n.id > seen.current! && !n.readAt);
      if (fresh.length) {
        chime();
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          const n = new Notification(fresh[0].title, { body: fresh[0].body ?? undefined, tag: `n-${fresh[0].id}` });
          n.onclick = () => {
            window.focus();
            const billId = billFromLink(fresh[0].link);
            if (billId) setQuickBill(billId);
            else if (fresh[0].link) router.push(fresh[0].link);
          };
        }
        router.refresh();
      }
    }
    seen.current = newest;
  }, [data, router]);

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.readAt) await api("/api/notifications/read", { body: { ids: [n.id] } }).catch(() => {});
    mutate();
    // Order/bill notifications open the bill right here so it can be acted on immediately.
    const billId = billFromLink(n.link);
    if (billId) setQuickBill(billId);
    else if (n.link) router.push(n.link);
  }

  async function markAll() {
    await api("/api/notifications/read", { body: {} }).catch(() => {});
    mutate();
  }

  const unread = data?.unread ?? 0;
  return (
    <div className="relative" ref={wrapper}>
      <button
        onClick={() => {
          setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
          setOpen((o) => !o);
        }}
        className="relative rounded-md p-2 text-zinc-300 hover:bg-raised hover:text-white"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        {unread > 0 ? <BellRing size={20} className="text-accent" /> : <Bell size={20} />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-white">Notifications</p>
              {unread > 0 && <button onClick={markAll} className="text-xs text-accent hover:underline">Mark all read</button>}
            </div>
            {permission === "default" && (
              <button
                onClick={() => Notification.requestPermission().then(setPermission)}
                className="w-full border-b border-line bg-accent/10 px-4 py-2.5 text-left text-xs text-accent hover:bg-accent/15"
              >
                Turn on phone alerts for new orders
              </button>
            )}
            <ul className="max-h-96 overflow-y-auto">
              {(data?.items ?? []).length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nothing yet</li>}
              {data?.items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => openItem(n)} className={cx("flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left hover:bg-raised", !n.readAt && "bg-raised/40")}>
                    <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs text-muted">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-zinc-600">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <BillQuickView billId={quickBill} me={me} onClose={() => setQuickBill(null)} />
    </div>
  );
}
