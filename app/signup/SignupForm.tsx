"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
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

  const f = (name: string, label: string, type = "text") => (
    <Field label={label} error={errors[name]?.[0]}>
      <Input name={name} type={type} required />
    </Field>
  );
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {f("firstname", "First name")}
      {f("lastname", "Last name")}
      {f("email", "Email", "email")}
      {f("password", "Password", "password")}
      {f("confirmPassword", "Confirm password", "password")}
      {formError && <p className="text-sm text-red-400">{formError}</p>}
      <Button size="lg" disabled={loading}>{loading ? "Creating…" : "Create owner account"}</Button>
    </form>
  );
}
