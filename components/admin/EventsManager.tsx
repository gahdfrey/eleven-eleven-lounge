"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { events } from "@/lib/db/schema";
import { api } from "@/lib/client";
import { formatDateTime, fromLagosInputValue, toLagosInputValue } from "@/lib/dates";
import { Modal } from "../Modal";
import { Badge, Button, EmptyState, Field, Input, Table, Td, Textarea, Th } from "../ui";

type Event = typeof events.$inferSelect & { past: boolean };

export function EventsManager({ events: rows }: { events: Event[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Event | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = editing === "new" ? null : editing;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      title: String(f.get("title")),
      description: String(f.get("description") || "") || null,
      startsAt: fromLagosInputValue(String(f.get("startsAt"))),
      endsAt: fromLagosInputValue(String(f.get("endsAt") || "")),
      entry: String(f.get("entry") || "") || null,
      published: f.get("published") === "on",
    };
    setBusy(true);
    setError("");
    try {
      await api(current ? `/api/events/${current.id}` : "/api/events", { method: current ? "PATCH" : "POST", body });
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus size={16} /> New event</Button></div>
      {rows.length === 0 ? (
        <EmptyState title="No events yet" description="Add your next party, live band or game night." action={<Button onClick={() => setEditing("new")}>New event</Button>} />
      ) : (
        <Table>
          <thead><tr><Th>Event</Th><Th>Starts</Th><Th>Entry</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {rows.map((ev) => {
              const past = ev.past;
              return (
                <tr key={ev.id} className={past ? "opacity-60" : ""}>
                  <Td className="text-white">{ev.title}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(ev.startsAt)}</Td>
                  <Td className="text-muted">{ev.entry || "—"}</Td>
                  <Td>{past ? <Badge>Past</Badge> : ev.published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(ev)} aria-label={`Edit ${ev.title}`}><Pencil size={14} /></Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400"
                      aria-label={`Delete ${ev.title}`}
                      onClick={() => confirm(`Delete "${ev.title}"?`) && api(`/api/events/${ev.id}`, { method: "DELETE" }).then(() => router.refresh())}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit event" : "New event"}>
        <form key={current?.id ?? "new"} onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Title"><Input name="title" defaultValue={current?.title} required maxLength={100} autoFocus /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Starts"><Input name="startsAt" type="datetime-local" defaultValue={toLagosInputValue(current?.startsAt)} required /></Field>
            <Field label="Ends (optional)"><Input name="endsAt" type="datetime-local" defaultValue={toLagosInputValue(current?.endsAt)} /></Field>
          </div>
          <Field label="Entry (optional)" hint='e.g. "Free entry" or "₦10,000 at the gate"'><Input name="entry" defaultValue={current?.entry ?? ""} maxLength={100} /></Field>
          <Field label="Description (optional)"><Textarea name="description" defaultValue={current?.description ?? ""} maxLength={2000} rows={5} /></Field>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="published" defaultChecked={current?.published ?? true} className="accent-[var(--color-accent)]" /> Published (visible to customers)
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button size="lg" disabled={busy}>{busy ? "Saving…" : "Save event"}</Button>
        </form>
      </Modal>
    </>
  );
}
