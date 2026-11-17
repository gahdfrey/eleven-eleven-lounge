"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input } from "../ui";

export function PasswordForm({ onDone, submitLabel = "Update password" }: { onDone?: () => void; submitLabel?: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      await api("/api/account/password", { body: Object.fromEntries(new FormData(form)) });
      form.reset();
      setSuccess(true);
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Current password">
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number.">
        <Input name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">Password updated.</p>}
      <Button size="lg" disabled={loading}>{loading ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
