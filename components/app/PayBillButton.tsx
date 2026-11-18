"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button } from "../ui";
import { PayBillDialog } from "./PayBillDialog";

/** "Record payment" straight from a bills table row. */
export function PayBillButton({ billId, total }: { billId: number; total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" disabled={total <= 0} onClick={() => setOpen(true)}>
        <Wallet size={14} /> Record payment
      </Button>
      <PayBillDialog billId={billId} total={total} open={open} onClose={() => setOpen(false)} onPaid={() => router.refresh()} />
    </>
  );
}
