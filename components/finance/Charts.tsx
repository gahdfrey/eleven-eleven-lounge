"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatNaira } from "@/lib/money";

/**
 * Small SVG/HTML charts for the finance page. Dark surface only, solid fills
 * (no gradients), thin marks, a recessive grid, and a hover tooltip on every mark.
 * Categorical colours are assigned to an entity, never to its rank.
 */
const ACCENT = "#d4a84b";
const GRID = "#232326";
const AXIS_TEXT = "#8b8b93";

/** ₦1.2M, ₦350k, ₦900 — for axis ticks. */
export function compactNaira(kobo: number) {
  const n = kobo / 100;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `₦${Math.round(n)}`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Rounded "nice" axis maximum and 4 ticks. */
function niceTicks(max: number) {
  if (max <= 0) return { top: 100, ticks: [0, 25, 50, 75, 100] };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 90), Math.max(90, width - 90));
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[160px] -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-lg"
      style={{ left, top: y - 8 }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export type StackSeries = { key: string; label: string; color: string };
export type StackBar = { key: string; label: string; values: Record<string, number>; sub?: string };

/** Vertical stacked bars (e.g. money per day split by payment method). */
export function StackedBars({ bars, series, height = 260 }: { bars: StackBar[]; series: StackSeries[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 52, r: 8, t: 10, b: 26 };
  const totals = bars.map((b) => series.reduce((n, s) => n + (b.values[s.key] ?? 0), 0));
  const { top, ticks } = niceTicks(Math.max(0, ...totals));
  const plotW = Math.max(0, width - pad.l - pad.r);
  const plotH = height - pad.t - pad.b;
  const slot = bars.length ? plotW / bars.length : 0;
  const barW = Math.max(2, Math.min(36, slot * 0.7));
  const y = (v: number) => pad.t + plotH - (v / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(bars.length / Math.max(1, Math.floor(plotW / 48))));

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Bar chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT}>{compactNaira(t)}</text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = pad.l + slot * i + slot / 2;
            let acc = 0;
            const segs = series
              .map((s) => ({ s, v: b.values[s.key] ?? 0 }))
              .filter((x) => x.v > 0);
            return (
              <g key={b.key} opacity={hover === null || hover === i ? 1 : 0.45}>
                {segs.map(({ s, v }, j) => {
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  const h = Math.max(1, y0 - y1 - (j < segs.length - 1 ? 2 : 0)); // 2px gap between segments
                  return <rect key={s.key} x={cx - barW / 2} y={y1} width={barW} height={h} rx={j === segs.length - 1 ? Math.min(4, barW / 2) : 0} fill={s.color} />;
                })}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>{b.label}</text>
                )}
                <rect x={pad.l + slot * i} y={pad.t} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
          <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} stroke="#3a3a3f" />
        </svg>
      )}
      {hover !== null && bars[hover] && (
        <Tooltip x={pad.l + slot * hover + slot / 2} y={y(totals[hover])} width={width}>
          <p className="mb-1 font-medium text-white">{bars[hover].label}{bars[hover].sub && <span className="font-normal text-muted"> · {bars[hover].sub}</span>}</p>
          {series.map((s) => (bars[hover].values[s.key] ?? 0) > 0 && (
            <p key={s.key} className="flex items-center justify-between gap-4 text-zinc-300">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>
              <span className="tabular-nums">{formatNaira(bars[hover].values[s.key])}</span>
            </p>
          ))}
          <p className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-medium text-white"><span>Total</span><span className="tabular-nums">{formatNaira(totals[hover])}</span></p>
        </Tooltip>
      )}
    </div>
  );
}

/** Single-series vertical bars (e.g. busy hours). */
export function SimpleBars({ bars, height = 200, color = ACCENT }: { bars: { key: string; label: string; value: number; sub?: string }[]; height?: number; color?: string }) {
  return (
    <StackedBars
      height={height}
      series={[{ key: "v", label: "Amount", color }]}
      bars={bars.map((b) => ({ key: b.key, label: b.label, sub: b.sub, values: { v: b.value } }))}
    />
  );
}

export type Slice = { label: string; value: number; color: string; sub?: string };

/** Donut with a legend that carries the numbers (identity is never colour alone). */
export function Donut({ slices, centerLabel }: { slices: Slice[]; centerLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((n, s) => n + s.value, 0);
  const size = 180;
  const r = 78;
  const inner = 52;
  const c = size / 2;
  const sweeps = slices.map((s) => (total ? (s.value / total) * Math.PI * 2 : 0));
  const arcs = slices.map((s, i) => {
    const a0 = -Math.PI / 2 + sweeps.slice(0, i).reduce((n, x) => n + x, 0);
    return { s, a0, a1: a0 + sweeps[i], sweep: sweeps[i] };
  });
  const pt = (a: number, rad: number) => `${c + rad * Math.cos(a)} ${c + rad * Math.sin(a)}`;
  const path = (a0: number, a1: number) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${pt(a0, r)} A ${r} ${r} 0 ${large} 1 ${pt(a1, r)} L ${pt(a1, inner)} A ${inner} ${inner} 0 ${large} 0 ${pt(a0, inner)} Z`;
  };
  const shown = hover !== null ? slices[hover] : null;

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @md:flex-row">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Pie chart">
        {total === 0 && <circle cx={c} cy={c} r={(r + inner) / 2} fill="none" stroke={GRID} strokeWidth={r - inner} />}
        {arcs.map(({ s, a0, a1, sweep }, i) =>
          sweep <= 0 ? null : sweep >= Math.PI * 2 - 1e-6 ? (
            <circle key={s.label} cx={c} cy={c} r={(r + inner) / 2} fill="none" stroke={s.color} strokeWidth={r - inner} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          ) : (
            <path
              key={s.label}
              d={path(a0, a1)}
              fill={s.color}
              stroke="#0b0b0c"
              strokeWidth={2}
              opacity={hover === null || hover === i ? 1 : 0.4}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ),
        )}
        <text x={c} y={c - 6} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>{shown ? shown.label : centerLabel ?? "Total"}</text>
        <text x={c} y={c + 12} textAnchor="middle" fontSize={14} fontWeight={600} fill="#fff">{compactNaira(shown ? shown.value : total)}</text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center justify-between gap-3 rounded px-1.5 py-0.5 ${hover === i ? "bg-raised" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="flex min-w-0 items-center gap-2 text-zinc-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-zinc-400">
              <span className="text-white">{formatNaira(s.value)}</span> · {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
        {slices.length === 0 && <li className="text-muted">No data for these filters</li>}
      </ul>
    </div>
    </div>
  );
}

/** Horizontal bars with labels and values (e.g. revenue per staff member, top items). */
export function HBars({ rows, color = ACCENT }: { rows: { label: string; value: number; sub?: string; color?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted">No data for these filters</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${formatNaira(r.value)}${r.sub ? ` · ${r.sub}` : ""}`} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-zinc-200">{r.label}{r.sub && <span className="ml-2 text-xs text-muted">{r.sub}</span>}</span>
            <span className="shrink-0 tabular-nums text-white">{formatNaira(r.value)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-raised">
            <div className="h-2 rounded-full transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(1, (r.value / max) * 100)}%`, background: r.color ?? color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
