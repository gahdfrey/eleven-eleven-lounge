"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt } from "lucide-react";
import type { MenuCategory } from "@/lib/menu";
import { OrderClient, billStorageKey } from "./OrderClient";

export function TableOrder({ menu, tableToken, staff }: { menu: MenuCategory[]; tableToken: string; staff: { id: number; name: string }[] }) {
  const router = useRouter();
  const [openBill, setOpenBill] = useState<{ token: string; staffName: string } | null>(null);

  // If this phone already has an open bill at this table, offer to go back to it.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(billStorageKey(tableToken));
    } catch {}
    if (!saved) return;
    fetch(`/api/public/bills/${saved}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.bill?.status === "open") setOpenBill({ token: saved!, staffName: d.bill.staffName });
        else {
          try {
            localStorage.removeItem(billStorageKey(tableToken));
          } catch {}
        }
      })
      .catch(() => {});
  }, [tableToken]);

  return (
    <>
      {openBill && (
        <Link href={`/bill/${openBill.token}`} className="mb-6 flex items-center justify-between rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-white">
            <Receipt size={16} className="text-accent" /> You have an open bill at this table
          </span>
          <span className="font-medium text-accent">View bill →</span>
        </Link>
      )}
      <OrderClient
        menu={menu}
        mode={openBill ? { kind: "add", billToken: openBill.token, staffName: openBill.staffName } : { kind: "new", tableToken, staff }}
        onPlaced={(token) => {
          try {
            localStorage.setItem(billStorageKey(tableToken), token);
          } catch {}
          router.push(`/bill/${token}`);
        }}
      />
    </>
  );
}
