import { Badge, type Tone } from "./ui";

const orderTones: Record<string, [Tone, string]> = {
  pending: ["warning", "Waiting"],
  accepted: ["info", "Accepted"],
  served: ["success", "Served"],
  rejected: ["neutral", "Declined"],
  void: ["danger", "Voided"],
};
const billTones: Record<string, [Tone, string]> = {
  open: ["accent", "Open"],
  paid: ["success", "Paid"],
  void: ["danger", "Voided"],
};

export function OrderStatus({ status }: { status: string }) {
  const [tone, label] = orderTones[status] ?? ["neutral", status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function BillStatus({ status }: { status: string }) {
  const [tone, label] = billTones[status] ?? ["neutral", status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", transfer: "Bank transfer", pos: "POS / card" };
