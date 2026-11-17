import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Eleven Eleven Lounge</h1>
      <p className="text-zinc-500">Setup complete. Build begins here.</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-md bg-foreground px-4 py-2 text-background">Log in</Link>
        <Link href="/signup" className="rounded-md border px-4 py-2">Sign up</Link>
      </div>
    </main>
  );
}
