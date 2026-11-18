import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError, handle } from "@/lib/api";
import { FINANCE, requireUser } from "@/lib/authz";
import { parseFinanceFilters } from "@/lib/finance";
import { DATASETS, exportCsv, exportWorkbook, type Dataset } from "@/lib/finance-export";

/**
 * Finance downloads. ?format=xlsx → one workbook with every sheet;
 * ?format=csv&dataset=… → one table. Takes the same filters as /finance.
 */
export const GET = handle(async (request: Request) => {
  await requireUser(FINANCE);
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const f = parseFinanceFilters(sp);
  const stamp = `${f.from}_to_${f.to}`;

  if (sp.format === "xlsx") {
    const [staff] = f.staffId ? await db.select({ firstname: users.firstname, lastname: users.lastname }).from(users).where(eq(users.id, f.staffId)) : [];
    const buf = await exportWorkbook(f, staff ? `${staff.firstname} ${staff.lastname}` : null);
    return new Response(new Uint8Array(buf as ArrayBuffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="lounge-finance_${stamp}.xlsx"`,
        "cache-control": "no-store",
      },
    });
  }

  const dataset = (sp.dataset ?? "transactions") as Dataset;
  if (!DATASETS.includes(dataset)) throw new AppError("Unknown report", 400);
  const { body } = await exportCsv(dataset, f);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lounge-${dataset}_${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
});
