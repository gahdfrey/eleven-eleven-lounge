"use client";

import { useState } from "react";

import useSWR from "swr";
import { Check, ExternalLink } from "lucide-react";
import type { BillDetail } from "@/lib/orders";
import { jsonFetcher } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { Modal } from "../Modal";
import { BillStatus } from "../StatusBadge";
import { Button, ButtonLink } from "../ui";
import { OrderList, type OrderView } from "./OrderList";
import { PayBillDialog } from "./PayBillDialog";

type Bill = Omit<BillDetail, "orders" | "createdAt"> & { createdAt: string; orders: OrderView[] };

/** A bill in a pop-up (opened from a notification): act on its orders and record payment without leaving the page. */
export function BillQuickView({ billId, me, onClose }: { billId: number | null; me: { id: number; manager: boolean }; onClose: () => void }) {
  const { data, error, mutate } = useSWR<{ bill: Bill }>(billId ? `/api/bills/${billId}` : null, jsonFetcher, { refreshInterval: 5000 });
  const [paying, setPaying] = useState(false);
  const bill = data?.bill;
  const canAct = !!bill && (bill.staffId === me.id || me.manager);
  const isOpen = bill?.status === "open";
  const pending = bill?.orders.filter((o) => o.status === "pending").length ?? 0;

  return (
    <>
      <Modal open={billId !== null && !paying} onClose={onClose} title={`Bill #${billId ?? ""}`} wide>
        {error ? (
          <p className="text-sm text-red-400">{(error as Error).message}</p>
        ) : !bill ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white">{bill.tableName ?? "Walk-in"}{bill.customerName ? ` · ${bill.customerName}` : ""}</p>
                <p className="text-xs text-muted">Served by {bill.staff.name}</p>
              </div>
              <div className="text-right">
                <BillStatus status={bill.status} />
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{formatNaira(bill.status === "paid" ? bill.paidAmount : bill.total)}</p>
                {bill.pendingTotal > 0 && <p className="text-xs text-amber-400">+ {formatNaira(bill.pendingTotal)} waiting</p>}
              </div>
            </div>
            <OrderList orders={bill.orders} billOpen={!!isOpen} canAct={canAct} manager={me.manager} onChanged={() => mutate()} />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              {isOpen && canAct && (
                <Button onClick={() => setPaying(true)} disabled={bill.total <= 0 || pending > 0}>
                  <Check size={16} /> Record payment · {formatNaira(bill.total)}
                </Button>
              )}
              <ButtonLink href={`/bills/${bill.id}`} variant="secondary" onClick={onClose}>
                <ExternalLink size={15} /> Open full bill
              </ButtonLink>
            </div>
            {isOpen && pending > 0 && <p className="mt-2 text-xs text-amber-300">Accept or decline the waiting order before recording payment.</p>}
          </>
        )}
      </Modal>
      {bill && (
        <PayBillDialog billId={bill.id} total={bill.total} open={paying} onClose={() => setPaying(false)} onPaid={() => mutate()} />
      )}
    </>
  );
}

