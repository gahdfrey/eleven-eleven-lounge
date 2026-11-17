"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks, type NavSection } from "./NavLinks";

export function MobileNav({ sections, footer }: { sections: NavSection[]; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="rounded-md p-2 text-zinc-300 hover:bg-raised lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-72 flex-col border-r border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex justify-end">
              <button className="rounded-md p-2 text-zinc-300 hover:bg-raised" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks sections={sections} onNavigate={() => setOpen(false)} />
            </div>
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
