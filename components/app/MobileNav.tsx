"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Portal } from "../Portal";
import { Logo } from "../ui";
import { NavLinks, type NavSection } from "./NavLinks";

/**
 * Phone/tablet navigation: a hamburger in the header opens a full-height
 * drawer. Rendered into <body> so the header's blur can't clip it.
 */
export function MobileNav({ sections, footer }: { sections: NavSection[]; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const pathname = usePathname();

  // Close when the page changes (e.g. after tapping a link).
  if (open && openedOn !== null && openedOn !== pathname) {
    setOpen(false);
    setOpenedOn(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        className="-ml-2 rounded-md p-2 text-zinc-200 hover:bg-raised lg:hidden"
        onClick={() => {
          setOpen(true);
          setOpenedOn(pathname);
        }}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu size={22} />
      </button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <aside className="drawer-in absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col border-r border-line bg-surface">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
                <Link href="/dashboard" onClick={() => setOpen(false)}><Logo /></Link>
                <button className="-mr-2 rounded-md p-2 text-zinc-300 hover:bg-raised hover:text-white" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavLinks sections={sections} onNavigate={() => setOpen(false)} />
              </div>
              <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
            </aside>
          </div>
        </Portal>
      )}
    </>
  );
}
