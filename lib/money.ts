const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** 250000 (kobo) → "₦2,500" */
export function formatNaira(kobo: number | null | undefined) {
  return naira.format((kobo ?? 0) / 100);
}

/** "2,500.50" or 2500.5 (naira) → 250050 (kobo) */
export function toKobo(nairaValue: string | number) {
  const n = typeof nairaValue === "number" ? nairaValue : Number(String(nairaValue).replace(/[,\s₦]/g, ""));
  return Math.round(n * 100);
}

export function fromKobo(kobo: number) {
  return kobo / 100;
}
