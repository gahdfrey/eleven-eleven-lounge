"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus } from "lucide-react";
import { api } from "@/lib/client";
import { Modal } from "../Modal";
import { Badge, Button, Field, Input, Select, Table, Td, Th } from "../ui";

type U = { id: number; staffNo: number; username: string; firstname: string; lastname: string; phone: string | null; role: string; active: boolean; mustChangePassword: boolean };

const ROLE_HELP: Record<string, string> = {
  staff: "Takes orders and closes their own bills.",
  manager: "Everything staff can do, plus menu, stock, voids, tables, events and cash reports.",
  finance: "Finance dashboard and exports, and receiving cash from staff. Cannot take orders or change the menu.",
  admin: "Full access, including creating users.",
};

export function UsersManager({ users, meId }: { users: U[]; meId: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("staff");
  const [credentials, setCredentials] = useState<{ name: string; username: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await api<{ user: { username: string; password: string } }>("/api/users", {
        body: { firstname: f.get("firstname"), lastname: f.get("lastname"), phone: f.get("phone") || undefined, role },
      });
      setCreating(false);
      setRole("staff");
      setCredentials({ name: `${f.get("firstname")} ${f.get("lastname")}`, ...res.user });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function update(id: number, body: Record<string, unknown>) {
    setError("");
    await api(`/api/users/${id}`, { method: "PATCH", body }).then(() => router.refresh(), (e) => setError(e.message));
  }

  async function reset(u: U) {
    if (!confirm(`Reset ${u.firstname}'s password to the default? They'll be asked to set a new one at next sign-in.`)) return;
    try {
      const res = await api<{ username: string; password: string }>(`/api/users/${u.id}/reset-password`, { body: {} });
      setCredentials({ name: `${u.firstname} ${u.lastname}`, ...res });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setCreating(true)}><Plus size={16} /> New user</Button></div>
      {error && <p className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Table>
        <thead><tr><Th>Username</Th><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.active ? "" : "opacity-50"}>
              <Td className="font-mono text-accent">{u.username}</Td>
              <Td><p className="text-white">{u.firstname} {u.lastname}</p>{u.phone && <p className="text-xs text-muted">{u.phone}</p>}</Td>
              <Td>
                <Select value={u.role} disabled={u.id === meId} onChange={(e) => update(u.id, { role: e.target.value })} className="h-8 w-auto text-xs">
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                </Select>
              </Td>
              <Td>
                {!u.active ? <Badge>Deactivated</Badge> : u.mustChangePassword ? <Badge tone="warning">Awaiting first sign-in</Badge> : <Badge tone="success">Active</Badge>}
              </Td>
              <Td className="text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => reset(u)}><KeyRound size={14} /> Reset password</Button>
                {u.id !== meId && (
                  <Button size="sm" variant={u.active ? "danger" : "secondary"} onClick={() => update(u.id, { active: !u.active })}>
                    {u.active ? "Deactivate" : "Reactivate"}
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={creating} onClose={() => setCreating(false)} title="New user">
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><Input name="firstname" required autoFocus maxLength={40} /></Field>
            <Field label="Last name"><Input name="lastname" required maxLength={40} /></Field>
          </div>
          <Field label="Phone (optional)"><Input name="phone" type="tel" maxLength={20} /></Field>
          <Field label="Role" hint={ROLE_HELP[role]}>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button size="lg" disabled={busy}>{busy ? "Creating…" : "Create user"}</Button>
        </form>
      </Modal>

      <Modal open={credentials !== null} onClose={() => setCredentials(null)} title="Sign-in details">
        {credentials && (
          <>
            <p className="mb-4 text-sm text-muted">Give these to {credentials.name}. They&apos;ll choose their own password when they first sign in.</p>
            <div className="rounded-lg border border-line bg-raised p-4 font-mono text-sm">
              <p><span className="text-muted">Username:</span> <span className="text-accent">{credentials.username}</span></p>
              <p className="mt-1"><span className="text-muted">Password:</span> <span className="text-white">{credentials.password}</span></p>
            </div>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigator.clipboard?.writeText(`Eleven Eleven Lounge staff sign-in\nUsername: ${credentials.username}\nPassword: ${credentials.password}\n${window.location.origin}/login`)}
            >
              <Copy size={14} /> Copy to send
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}
