import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { isManager, requirePageUser } from "@/lib/authz";
import { getBillDetail } from "@/lib/orders";
import { getMenu } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { getBaseUrl } from "@/lib/url";
import { qrSvg } from "@/lib/qr";
import { BillStatus, PAYMENT_LABELS } from "@/components/StatusBadge";
import { Card } from "@/components/ui";
import { BillActions } from "@/components/app/BillActions";

export const metadata: Metadata = { title: "Bill" };

export default async function BillDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ add?: string }> }) {
  const user = await requirePageUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const bill = await getBillDetail({ id });
  if (!bill) notFound();
  const manager = isManager(user);
  if (bill.staffId !== user.id && !manager) redirect("/bills");

  const [menu, base] = await Promise.all([getMenu(), getBaseUrl()]);
  const customerUrl = `${base}/bill/${bill.accessToken}`;
  const customerQr = await qrSvg(customerUrl);

  return (
    <>
      <Link href="/bills" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-white"><ChevronLeft size={16} /> Bills</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="order-2 lg:order-1">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">Bill #{bill.id}</h1>
            <BillStatus status={bill.status} />
          </div>
          <BillActions
            bill={bill}
            menu={menu}
            canAct={bill.staffId === user.id || manager}
            manager={manager}
            customerQr={customerQr}
            customerUrl={customerUrl}
            openPicker={(await searchParams).add === "1"}
          />
        </div>
        <Card className="order-1 h-fit p-5 lg:order-2">
          <p className="text-xs uppercase tracking-wide text-muted">{bill.status === "paid" ? "Paid" : "Total"}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-white">{formatNaira(bill.status === "paid" ? bill.paidAmount : bill.total)}</p>
          {bill.pendingTotal > 0 && <p className="mt-1 text-sm text-amber-400">+ {formatNaira(bill.pendingTotal)} waiting</p>}
          <dl className="mt-5 grid grid-cols-[90px_1fr] gap-y-2 border-t border-line pt-4 text-sm">
            <dt className="text-muted">Staff</dt>
            <dd className="text-white">{bill.staff.name} <span className="font-mono text-xs text-muted">{bill.staff.username}</span></dd>
            <dt className="text-muted">Table</dt><dd className="text-white">{bill.tableName ?? "Walk-in"}</dd>
            <dt className="text-muted">Customer</dt><dd className="text-white">{bill.customerName || "—"}</dd>
            <dt className="text-muted">Opened</dt><dd className="text-white">{formatDateTime(bill.createdAt)}</dd>
            {bill.status === "paid" && (
              <>
                <dt className="text-muted">Payment</dt><dd className="text-white">{PAYMENT_LABELS[bill.paymentMethod ?? ""]}</dd>
                <dt className="text-muted">Paid at</dt><dd className="text-white">{formatDateTime(bill.paidAt)}</dd>
              </>
            )}
            {bill.status === "void" && (<><dt className="text-muted">Void reason</dt><dd className="text-red-300">{bill.voidReason}</dd></>)}
          </dl>
        </Card>
      </div>
    </>
  );
}
