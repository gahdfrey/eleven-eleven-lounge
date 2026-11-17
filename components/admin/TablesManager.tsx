"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { api } from "@/lib/client";
import { Modal } from "../Modal";
import { Badge, Button, Card, EmptyState, Field, Input } from "../ui";

type T = { id: number; name: string; active: boolean; url: string; qr: string };

export function TablesManager({ tables }: { tables: T[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setAdding(true)}><Plus size={16} /> Add table</Button></div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {tables.length === 0 ? (
        <EmptyState title="No tables yet" description="Add your tables (e.g. Table 1, VIP 2, Bar) to generate their QR codes." action={<Button onClick={() => setAdding(true)}>Add table</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((t) => (
            <Card key={t.id} className="flex flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-white">{t.name}</h3>
                {t.active ? <Badge tone="success">Active</Badge> : <Badge>Off</Badge>}
              </div>
              <div className={`mx-auto w-40 rounded-lg bg-white p-2 ${t.active ? "" : "opacity-30"}`} dangerouslySetInnerHTML={{ __html: t.qr }} />
              <a href={t.url} target="_blank" className="mt-3 flex items-center justify-center gap-1 truncate text-xs text-muted hover:text-accent">
                Open customer page <ExternalLink size={12} />
              </a>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                <Button size="sm" variant="secondary" onClick={() => act(() => api(`/api/tables/${t.id}`, { method: "PATCH", body: { active: !t.active } }))}>
                  {t.active ? "Turn off" : "Turn on"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="New QR code; the old printed one stops working"
                  onClick={() => confirm(`Issue a new QR code for ${t.name}? The old printed code will stop working.`) && act(() => api(`/api/tables/${t.id}`, { method: "PATCH", body: { regenerate: true } }))}
                >
                  <RefreshCw size={14} /> New code
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-red-400"
                  onClick={() => confirm(`Delete ${t.name}?`) && act(() => api(`/api/tables/${t.id}`, { method: "DELETE" }))}
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add table">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name"));
            act(() => api("/api/tables", { body: { name } })).then(() => setAdding(false));
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Table name"><Input name="name" required autoFocus placeholder="e.g. Table 4, VIP 1, Bar" maxLength={40} /></Field>
          <Button size="lg">Create table and QR code</Button>
        </form>
      </Modal>
    </>
  );
}
