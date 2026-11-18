import type { Metadata } from "next";
import { isManager, requirePageUser, SERVICE } from "@/lib/authz";
import { PageHeader, ButtonLink } from "@/components/ui";
import { Plus } from "lucide-react";
import { QueueClient } from "@/components/app/QueueClient";

export const metadata: Metadata = { title: "Live orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requirePageUser(SERVICE);
  // Managers and admins oversee everyone by default; staff only ever see their own.
  const all = isManager(user) && (await searchParams).scope !== "mine";
  return (
    <>
      <PageHeader
        title="Live orders"
        description={all ? "Everyone's orders, updating automatically. Accept to add an order to the bill; mark it served to take it out of stock." : "Your orders, updating automatically. Accept to add an order to the bill; mark it served to take it out of stock."}
        actions={
          <>
            {isManager(user) && (
              <ButtonLink href={all ? "/orders?scope=mine" : "/orders"} variant="secondary">{all ? "Show only mine" : "Show all staff"}</ButtonLink>
            )}
            <ButtonLink href="/orders/new"><Plus size={16} /> New order</ButtonLink>
          </>
        }
      />
      <QueueClient scopeAll={all} />
    </>
  );
}
