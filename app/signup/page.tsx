"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FieldErrors = Record<string, string[] | undefined>;

const fields = [
  { name: "firstname", type: "text", placeholder: "First name" },
  { name: "lastname", type: "text", placeholder: "Last name" },
  { name: "email", type: "email", placeholder: "Email" },
  { name: "password", type: "password", placeholder: "Password" },
  { name: "confirmPassword", type: "password", placeholder: "Confirm password" },
];

export default function SignupPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    setLoading(false);
    if (res.ok) return router.push("/login");
    const body = await res.json().catch(() => ({}));
    if (body.errors) setErrors(body.errors);
    else setFormError(body.error ?? "Something went wrong");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-2xl font-semibold">Create account</h1>
        {fields.map((f) => (
          <div key={f.name} className="flex flex-col gap-1">
            <input {...f} required className="rounded-md border px-3 py-2" />
            {errors[f.name]?.[0] && <p className="text-sm text-red-600">{errors[f.name]![0]}</p>}
          </div>
        ))}
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <button disabled={loading} className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50">
          {loading ? "Creating…" : "Sign up"}
        </button>
        <p className="text-sm text-zinc-500">
          Have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}
