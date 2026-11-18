"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, QrCode } from "lucide-react";
import type { BillDetail } from "@/lib/orders";
import type { MenuCategory } from "@/lib/menu";
import { api } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { ItemPicker } from "./ItemPicker";
import { OrderList } from "./OrderList";
import { PayBillDialog } from "./PayBillDialog";
import { ReasonDialog } from "./ReasonDialog";

type Props = {
  bill: Pick<BillDetail, "id" | "status" | "total" | "pendingTotal" | "orders">;
  menu: MenuCategory[];
  canAct: boolean;
  manager: boolean;
  customerQr: string;
  customerUrl: string;
  openPicker: boolean;
};

export function BillActions({ bill, menu, canAct, manager, customerQr, customerUrl, openPicker }: Props) {
  const router = useRouter();
  const [picker, setPicker] = useState(openPicker && bill.status === "open" && canAct);
  const [paying, setPaying] = useState(false);
  const [share, setShare] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const isOpen = bill.status === "open";
  const pending = bill.orders.filter((o) => o.status === "pending").length;

  useEffect(() => {
    // Drop ?add=1 so a refresh doesn't reopen the picker.
    if (openPicker) router.replace(`/bills/${bill.id}`, { scroll: false });
  }, [openPicker, bill.id, router]);

  return (
    <>
      {isOpen && canAct && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button onClick={() => setPicker(true)}><Plus size={16} /> Add items</Button>
          <Button variant="secondary" onClick={() => setPaying(true)} disabled={bill.total <= 0 || pending > 0}>
            <Check size={16} /> Record payment · {formatNaira(bill.total)}
          </Button>
          <Button variant="ghost" onClick={() => setShare(true)}><QrCode size={16} /> Customer view</Button>
          {manager && <Button variant="danger" onClick={() => setVoiding(true)}>Void bill</Button>}
        </div>
      )}
      {pending > 0 && isOpen && <p className="mb-4 text-sm text-amber-300">Accept or decline the waiting order{pending > 1 ? "s" : ""} before recording payment.</p>}

      <OrderList orders={bill.orders} billOpen={isOpen} canAct={canAct} manager={manager} onChanged={() => router.refresh()} />

      <ItemPicker open={picker} onClose={() => setPicker(false)} billId={bill.id} menu={menu} onSaved={() => router.refresh()} />
      <PayBillDialog billId={bill.id} total={bill.total} open={paying} onClose={() => setPaying(false)} onPaid={() => router.refresh()} />

      <Modal open={share} onClose={() => setShare(false)} title="Customer view">
        <p className="mb-4 text-sm text-muted">Let the customer scan this to follow their bill and order more from their phone.</p>
        <div className="mx-auto w-56 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: customerQr }} />
        <p className="mt-4 break-all text-center font-mono text-xs text-zinc-500">{customerUrl}</p>
      </Modal>

      <ReasonDialog
        open={voiding}
        title="Void whole bill"
        description="Any stock already taken out goes back and the staff member is notified. This is recorded against your name."
        confirmLabel="Void bill"
        onClose={() => setVoiding(false)}
        onConfirm={async (reason) => {
          await api(`/api/bills/${bill.id}/void`, { body: { reason } });
          router.refresh();
        }}
      />
    </>
  );
}
