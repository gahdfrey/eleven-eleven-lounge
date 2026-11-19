import Link from "next/link";
import { Logo } from "../ui";

export function PublicHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/menu" className="rounded-md px-3 py-1.5 text-zinc-300 hover:bg-raised hover:text-white">Menu</Link>
          <Link href="/events" className="rounded-md px-3 py-1.5 text-zinc-300 hover:bg-raised hover:text-white">Events</Link>
          <Link href="/#reserve" className="ml-1 rounded-full bg-accent px-3 py-1.5 font-medium text-black hover:bg-accent-strong">Reserve</Link>
          {right}
        </nav>
      </div>
    </header>
  );
}
