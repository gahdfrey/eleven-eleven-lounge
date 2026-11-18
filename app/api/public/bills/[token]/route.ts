import { NextResponse } from "next/server";
import { AppError, handle } from "@/lib/api";
import { getBillDetail } from "@/lib/orders";

/** Customer's live view of their bill. Exposes only what the customer should see. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const bill = await getBillDetail({ accessToken: token });
  if (!bill) throw new AppError("Bill not found", 404);
  return NextResponse.json({
    bill: {
      code: bill.id,
      status: bill.status,
      tableName: bill.tableName,
      customerName: bill.customerName,
      staffName: bill.staff.name.replace(/ (\S)\S*$/, " $1."),
      paymentMethod: bill.paymentMethod,
      paidAt: bill.paidAt,
      createdAt: bill.createdAt,
      total: bill.total,
      pendingTotal: bill.pendingTotal,
      orders: bill.orders.map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        servedAt: o.servedAt,
        rejectReason: o.rejectReason,
        total: o.total,
        items: o.items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
      })),
    },
  });
});
