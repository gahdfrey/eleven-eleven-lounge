import ExcelJS from "exceljs";
import {
  METHOD_LABELS,
  STATUS_LABELS,
  byCategory,
  financeByHour,
  financeByProduct,
  financeByStaff,
  financeRemittances,
  financeSummary,
  financeTransactions,
  financeTrend,
  financeVoids,
  type FinanceFilters,
} from "./finance";
import { formatDateTime } from "./dates";

export const DATASETS = ["transactions", "staff", "products", "categories", "trend", "hours", "voids", "remittances"] as const;
export type Dataset = (typeof DATASETS)[number];

type Col = { header: string; key: string; money?: boolean; width?: number };
type Sheet = { name: string; columns: Col[]; rows: Record<string, unknown>[] };

const naira = (kobo: number) => Math.round(kobo) / 100;

async function buildSheet(dataset: Dataset, f: FinanceFilters): Promise<Sheet> {
  switch (dataset) {
    case "transactions": {
      const { rows } = await financeTransactions(f);
      return {
        name: "Transactions",
        columns: [
          { header: "Bill #", key: "id", width: 8 },
          { header: "Date", key: "date", width: 20 },
          { header: "Opened", key: "openedAt", width: 20 },
          { header: "Status", key: "status", width: 10 },
          { header: "Payment", key: "method", width: 10 },
          { header: "Staff", key: "staff", width: 22 },
          { header: "Username", key: "staffUsername", width: 12 },
          { header: "Table", key: "table", width: 12 },
          { header: "Customer", key: "customer", width: 18 },
          { header: "Orders", key: "orders", width: 8 },
          { header: "Items", key: "items", width: 8 },
          { header: "Amount (₦)", key: "value", money: true, width: 14 },
          { header: "Closed by", key: "closedBy", width: 14 },
          { header: "Void reason", key: "voidReason", width: 28 },
        ],
        rows: rows.map((r) => ({
          ...r,
          date: formatDateTime(r.date),
          openedAt: formatDateTime(r.openedAt),
          status: STATUS_LABELS[r.status],
          method: r.method ? METHOD_LABELS[r.method] : "",
        })),
      };
    }
    case "staff":
      return {
        name: "By staff",
        columns: [
          { header: "Staff", key: "name", width: 22 },
          { header: "Username", key: "username", width: 12 },
          { header: "Bills", key: "bills", width: 8 },
          { header: "Amount (₦)", key: "value", money: true, width: 14 },
          { header: "Cash (₦)", key: "cash", money: true, width: 14 },
          { header: "Transfer (₦)", key: "transfer", money: true, width: 14 },
          { header: "POS (₦)", key: "pos", money: true, width: 14 },
          { header: "Average bill (₦)", key: "avgBill", money: true, width: 14 },
          { header: "Voided orders", key: "voidedOrders", width: 10 },
          { header: "Cash remitted in period (₦)", key: "remitted", money: true, width: 16 },
          { header: "Cash still owed, all time (₦)", key: "cashOutstanding", money: true, width: 16 },
        ],
        rows: await financeByStaff(f),
      };
    case "products":
      return {
        name: "By item",
        columns: [
          { header: "Item", key: "name", width: 30 },
          { header: "Category", key: "category", width: 20 },
          { header: "Qty", key: "qty", width: 8 },
          { header: "Amount (₦)", key: "value", money: true, width: 14 },
          { header: "Average price (₦)", key: "avgPrice", money: true, width: 14 },
        ],
        rows: await financeByProduct(f),
      };
    case "categories":
      return {
        name: "By category",
        columns: [
          { header: "Category", key: "category", width: 22 },
          { header: "Qty", key: "qty", width: 8 },
          { header: "Amount (₦)", key: "value", money: true, width: 14 },
        ],
        rows: byCategory(await financeByProduct(f)),
      };
    case "trend": {
      const { unit, buckets } = await financeTrend(f);
      return {
        name: unit === "day" ? "By day" : "By month",
        columns: [
          { header: unit === "day" ? "Date" : "Month", key: "key", width: 12 },
          { header: "Bills", key: "bills", width: 8 },
          { header: "Cash (₦)", key: "cash", money: true, width: 14 },
          { header: "Transfer (₦)", key: "transfer", money: true, width: 14 },
          { header: "POS (₦)", key: "pos", money: true, width: 14 },
          { header: "Unpaid / voided (₦)", key: "none", money: true, width: 14 },
          { header: "Total (₦)", key: "total", money: true, width: 14 },
        ],
        rows: buckets.map((b) => ({ key: b.key, bills: b.bills, total: b.total, ...b.byMethod })),
      };
    }
    case "hours":
      return {
        name: "By hour",
        columns: [
          { header: "Hour", key: "label", width: 12 },
          { header: "Bills", key: "bills", width: 8 },
          { header: "Amount (₦)", key: "value", money: true, width: 14 },
        ],
        rows: (await financeByHour(f)).map((h) => ({ ...h, label: `${String(h.hour).padStart(2, "0")}:00` })),
      };
    case "voids":
      return {
        name: "Voided orders",
        columns: [
          { header: "Order #", key: "orderId", width: 8 },
          { header: "Bill #", key: "billId", width: 8 },
          { header: "Voided at", key: "at", width: 20 },
          { header: "Staff", key: "staff", width: 22 },
          { header: "Voided by", key: "voidedBy", width: 14 },
          { header: "Reason", key: "reason", width: 28 },
          { header: "Items", key: "items", width: 36 },
          { header: "Amount (₦)", key: "value", money: true, width: 14 },
        ],
        rows: (await financeVoids(f)).map((v) => ({ ...v, at: formatDateTime(v.at) })),
      };
    case "remittances":
      return {
        name: "Cash remitted",
        columns: [
          { header: "Date", key: "at", width: 20 },
          { header: "Staff", key: "staff", width: 22 },
          { header: "Received by", key: "receivedBy", width: 22 },
          { header: "Amount (₦)", key: "amount", money: true, width: 14 },
          { header: "Note", key: "note", width: 28 },
        ],
        rows: (await financeRemittances(f)).map((r) => ({ ...r, at: formatDateTime(r.at) })),
      };
  }
}

/**
 * Spreadsheet apps run cells that start with = + - @ as formulas. Customer
 * names come from the public QR page, so neutralise them (CSV injection).
 */
function safeText(v: unknown) {
  if (typeof v !== "string") return v;
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

const cellValue = (c: Col, v: unknown) => (v == null ? "" : c.money ? naira(Number(v)) : safeText(v));

export async function exportCsv(dataset: Dataset, f: FinanceFilters) {
  const sheet = await buildSheet(dataset, f);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [sheet.columns.map((c) => esc(c.header)).join(","), ...sheet.rows.map((r) => sheet.columns.map((c) => esc(cellValue(c, r[c.key]))).join(","))];
  // BOM so Excel opens the ₦ and names correctly.
  return { body: "﻿" + lines.join("\r\n") + "\r\n", name: sheet.name };
}

/** One workbook: a summary sheet plus every breakdown on its own sheet. */
export async function exportWorkbook(f: FinanceFilters, staffName: string | null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Eleven Eleven Lounge";
  wb.created = new Date();

  const s = await financeSummary(f);
  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 34 }, { width: 22 }];
  summary.addRow(["Eleven Eleven Lounge — Finance report"]).font = { bold: true, size: 14 };
  summary.addRow([`${f.from} to ${f.to}`]);
  summary.addRow([`Staff: ${staffName ?? "Everyone"} · Bills: ${STATUS_LABELS[f.status]}${f.method ? ` · Paid by ${METHOD_LABELS[f.method]}` : ""}`]);
  summary.addRow([`Generated ${formatDateTime(new Date())}`]).font = { color: { argb: "FF777777" } };
  summary.addRow([]);
  const money: [string, number][] = [
    ["Revenue (paid bills)", s.revenue],
    ["Cash", s.byMethod.cash],
    ["Transfer", s.byMethod.transfer],
    ["POS", s.byMethod.pos],
    ["Average bill", s.avgBill],
    ["Open bills, not yet paid", s.openValue],
    ["Voided bills", s.voidValue],
    ["Voided orders on other bills", s.voidedOrdersValue],
    ["Cash collected in period", s.cashCollected],
    ["Cash remitted in period", s.remitted],
    ["Cash still with staff (all time)", s.cashOutstanding],
  ];
  for (const [label, kobo] of money) summary.addRow([label, naira(kobo)]).getCell(2).numFmt = '"₦"#,##0.00';
  summary.addRow([]);
  for (const [label, n] of [
    ["Paid bills", s.paidBills],
    ["Open bills", s.openBills],
    ["Voided bills", s.voidBills],
    ["Voided orders", s.voidedOrders],
    ["Items sold", s.itemsSold],
  ] as const)
    summary.addRow([label, n]);

  for (const ds of DATASETS) {
    const sheet = await buildSheet(ds, f);
    const ws = wb.addWorksheet(sheet.name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 14 }));
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    for (const r of sheet.rows) ws.addRow(Object.fromEntries(sheet.columns.map((c) => [c.key, cellValue(c, r[c.key])])));
    sheet.columns.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = '"₦"#,##0.00';
    });
    if (sheet.rows.length) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
      const totals: Record<string, unknown> = { [sheet.columns[0].key]: "Total" };
      sheet.columns.forEach((c, i) => {
        if (c.money && i > 0) {
          const col = ws.getColumn(i + 1).letter;
          totals[c.key] = { formula: `SUBTOTAL(9,${col}2:${col}${sheet.rows.length + 1})` };
        }
      });
      if (sheet.columns.some((c) => c.money)) ws.addRow(totals).font = { bold: true };
    }
  }
  return wb.xlsx.writeBuffer();
}
