import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent whitespace-nowrap";
const buttonVariants = {
  primary: "bg-accent text-black hover:bg-accent-strong",
  secondary: "border border-line bg-raised text-zinc-100 hover:border-zinc-600",
  ghost: "text-zinc-300 hover:bg-raised hover:text-white",
  danger: "border border-red-900/70 bg-red-950/40 text-red-300 hover:bg-red-950/70",
};
const buttonSizes = { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-12 px-5 text-base" };

type ButtonStyle = { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes };

export function buttonClass({ variant = "primary", size = "md" }: ButtonStyle = {}, extra?: string) {
  return cx(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & ButtonStyle) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}

const fieldBase =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldBase, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "h-10", className)} {...props} />;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-400">{error}</span> : hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-line bg-surface", className)} {...props} />;
}

const tones = {
  neutral: "border-line bg-raised text-zinc-300",
  accent: "border-accent/40 bg-accent/10 text-accent",
  success: "border-emerald-900 bg-emerald-950/60 text-emerald-300",
  warning: "border-amber-900 bg-amber-950/50 text-amber-300",
  danger: "border-red-900 bg-red-950/50 text-red-300",
  info: "border-sky-900 bg-sky-950/50 text-sky-300",
};
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium text-zinc-200">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" | "accent" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cx("mt-2 text-2xl font-semibold tabular-nums", tone === "danger" ? "text-red-400" : tone === "accent" ? "text-accent" : "text-white")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={cx("border-b border-line bg-surface px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted", className)} {...props} />;
}
export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cx("border-b border-line/60 px-4 py-3 align-middle", className)} {...props} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-baseline gap-2 font-semibold tracking-tight", className)}>
      <span className="font-mono text-accent">11:11</span>
      <span className="text-white">Lounge</span>
    </span>
  );
}
