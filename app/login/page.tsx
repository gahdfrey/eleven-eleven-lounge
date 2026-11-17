"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Logo } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      identifier: form.get("identifier"),
      password: form.get("password"),
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      return setError("Incorrect username or password, or the account is deactivated.");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl">
          <Logo />
        </Link>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-white">Staff sign in</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Use the username you were given, e.g. 11:11/4.</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Username">
              <Input name="identifier" autoComplete="username" autoCapitalize="none" placeholder="11:11/1" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button size="lg" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-zinc-600">Forgot your password? Ask an admin to reset it.</p>
      </div>
    </main>
  );
}
