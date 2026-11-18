"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Package, PlusCircle, QrCode, Receipt, ScrollText, UserCog, Users,
} from "lucide-react";
import { cx } from "../ui";

const ICONS = { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Package, PlusCircle, QrCode, Receipt, ScrollText, UserCog, Users };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
export type NavSection = { title?: string; items: NavItem[] };

export function NavLinks({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6">
      {sections.map((s, i) => (
        <div key={i}>
          {s.title && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-600">{s.title}</p>}
          <ul className="flex flex-col gap-0.5">
            {s.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.href || (pathname.startsWith(`${item.href}/`) && !sections.some((x) => x.items.some((o) => o.href !== item.href && o.href.startsWith(item.href) && pathname.startsWith(o.href))));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cx(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors lg:py-2 lg:text-sm",
                      active ? "bg-raised text-white" : "text-zinc-400 hover:bg-raised/60 hover:text-white",
                    )}
                  >
                    <Icon size={16} className={active ? "text-accent" : ""} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
