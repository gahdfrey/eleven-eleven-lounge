import Link from "next/link";
import { signOut } from "@/auth";
import { isManager, requirePageUser } from "@/lib/authz";
import { NavLinks, type NavSection } from "@/components/app/NavLinks";
import { MobileNav } from "@/components/app/MobileNav";
import { NotificationBell } from "@/components/app/NotificationBell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { changeFingerprint } from "@/lib/live";
import { Logo } from "@/components/ui";
import { LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const manager = isManager(user);
  const liveVersion = await changeFingerprint("staff");

  const sections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/orders/new", label: "New order", icon: "PlusCircle" },
        { href: "/orders", label: "Live orders", icon: "ClipboardList" },
        { href: "/bills", label: manager ? "All bills" : "My bills", icon: "Receipt" },
      ],
    },
  ];
  if (manager) {
    sections.push({
      title: "Manage",
      items: [
        { href: "/admin/reports", label: "Staff & cash", icon: "BarChart3" },
        { href: "/admin/menu", label: "Menu & stock", icon: "Package" },
        { href: "/admin/inventory", label: "Stock ledger", icon: "ScrollText" },
        { href: "/admin/tables", label: "Tables & QR", icon: "QrCode" },
        { href: "/admin/events", label: "Events", icon: "CalendarDays" },
        ...(user.role === "admin" ? [{ href: "/admin/users", label: "Users", icon: "Users" as const }] : []),
      ],
    });
  }
  sections.push({ items: [{ href: "/account", label: "My account", icon: "UserCog" }] });

  const userFooter = (
    <div className="mt-4 border-t border-line pt-4">
      <p className="truncate text-sm font-medium text-white">{user.firstname} {user.lastname}</p>
      <p className="font-mono text-xs text-muted">{user.username} · {user.role}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="mt-3 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <LogOut size={14} /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <LiveRefresh version={liveVersion} />
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Link href="/dashboard" className="mb-8 px-3 pt-2"><Logo /></Link>
        <div className="flex-1 overflow-y-auto"><NavLinks sections={sections} /></div>
        {userFooter}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-black/95 px-4 backdrop-blur lg:justify-end">
          <div className="flex items-center gap-1 lg:hidden">
            <MobileNav sections={sections} footer={userFooter} />
            <Link href="/dashboard" className="ml-1"><Logo /></Link>
          </div>
          <NotificationBell me={{ id: user.id, manager }} />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
