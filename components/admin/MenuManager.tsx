"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, PackagePlus, Trash2 } from "lucide-react";
import type { Product } from "@/lib/db/schema";
import { api } from "@/lib/client";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";
import { Modal } from "../Modal";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Table, Td, Textarea, Th, cx } from "../ui";

type Category = { id: number; name: string; sortOrder: number };

export function MenuManager({ categories, products }: { categories: Category[]; products: Product[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [catModal, setCatModal] = useState<Category | "new" | null>(null);

  const shown = products.filter((p) => filter === "all" || (filter === "none" ? !p.categoryId : String(p.categoryId) === filter));
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "Other";

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Categories</p>
          <button onClick={() => setCatModal("new")} className="rounded p-1 text-accent hover:bg-raised" aria-label="Add category"><Plus size={16} /></button>
        </div>
        <ul className="flex flex-col gap-0.5 text-sm">
          {[{ key: "all", label: `All items (${products.length})` }, ...categories.map((c) => ({ key: String(c.id), label: c.name, cat: c }))].map((c) => (
            <li key={c.key} className="group flex items-center">
              <button onClick={() => setFilter(c.key)} className={cx("flex-1 rounded-md px-2 py-1.5 text-left", filter === c.key ? "bg-raised text-white" : "text-zinc-400 hover:text-white")}>{c.label}</button>
              {"cat" in c && c.cat && (
                <button onClick={() => setCatModal(c.cat!)} className="rounded p-1 text-zinc-600 opacity-0 hover:text-white group-hover:opacity-100" aria-label={`Edit ${c.label}`}><Pencil size={13} /></button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setEditing("new")}><Plus size={16} /> Add item</Button>
        </div>
        {shown.length === 0 ? (
          <EmptyState title="No items yet" description="Add drinks and food with their price and opening stock." action={<Button onClick={() => setEditing("new")}>Add item</Button>} />
        ) : (
          <Table>
            <thead>
              <tr><Th>Item</Th><Th>Category</Th><Th className="text-right">Price</Th><Th className="text-right">In stock</Th><Th /></tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const low = p.trackStock && p.stockQty <= p.lowStockAt;
                return (
                  <tr key={p.id}>
                    <Td>
                      <p className="text-white">{p.name}</p>
                      {!p.available && <Badge className="mt-1">Hidden from menu</Badge>}
                    </Td>
                    <Td className="text-muted">{catName(p.categoryId)}</Td>
                    <Td className="text-right tabular-nums">{formatNaira(p.price)}</Td>
                    <Td className="text-right">
                      {p.trackStock ? (
                        <span className={cx("tabular-nums", p.stockQty <= 0 ? "text-red-400" : low ? "text-amber-400" : "text-white")}>{p.stockQty}</span>
                      ) : (
                        <span className="text-xs text-zinc-500">Not tracked</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setStockFor(p)}><PackagePlus size={14} /> Stock</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil size={14} /></Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      {editing && <ProductModal product={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
      {stockFor && <StockModal product={stockFor} onClose={() => setStockFor(null)} onSaved={() => { setStockFor(null); router.refresh(); }} />}
      {catModal && <CategoryModal category={catModal === "new" ? null : catModal} onClose={() => setCatModal(null)} onSaved={() => { setCatModal(null); setFilter("all"); router.refresh(); }} />}
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get("name")),
      description: String(f.get("description") || "") || null,
      categoryId: f.get("categoryId") ? Number(f.get("categoryId")) : null,
      price: toKobo(String(f.get("price"))),
      trackStock,
      lowStockAt: Number(f.get("lowStockAt") || 0),
      available: f.get("available") === "on",
      ...(product ? {} : { openingStock: trackStock ? Number(f.get("openingStock") || 0) : 0 }),
    };
    if (!Number.isFinite(body.price)) return setError("Enter a valid price");
    setBusy(true);
    setError("");
    try {
      await api(product ? `/api/products/${product.id}` : "/api/products", { method: product ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!product || !confirm(`Remove ${product.name} from the menu? Its sales history is kept.`)) return;
    await api(`/api/products/${product.id}`, { method: "DELETE" }).then(onSaved, (e) => setError(e.message));
  }

  return (
    <Modal open onClose={onClose} title={product ? `Edit ${product.name}` : "Add item"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name"><Input name="name" defaultValue={product?.name} required maxLength={80} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)"><Input name="price" inputMode="decimal" defaultValue={product ? fromKobo(product.price) : ""} required placeholder="2500" /></Field>
          <Field label="Category">
            <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
              <option value="">Other</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description (optional)"><Textarea name="description" defaultValue={product?.description ?? ""} maxLength={300} /></Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="accent-[var(--color-accent)]" />
          Track stock for this item (recommended for drinks)
        </label>
        {trackStock && (
          <div className="grid grid-cols-2 gap-3">
            {!product && <Field label="Opening stock"><Input name="openingStock" type="number" min={0} defaultValue={0} /></Field>}
            <Field label="Warn when stock is at or below"><Input name="lowStockAt" type="number" min={0} defaultValue={product?.lowStockAt ?? 5} /></Field>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" name="available" defaultChecked={product?.available ?? true} className="accent-[var(--color-accent)]" />
          Show on menu
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {product ? <Button type="button" variant="ghost" onClick={remove} className="text-red-400"><Trash2 size={14} /> Remove</Button> : <span />}
          <Button disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function StockModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState<"restock" | "waste" | "adjustment">("restock");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Math.trunc(Number(qty) || 0);
  const change = reason === "restock" ? Math.abs(n) : reason === "waste" ? -Math.abs(n) : n - product.stockQty;

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/products/${product.id}/stock`, { body: { reason, change, note: note || undefined } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Stock · ${product.name}`}>
      <p className="mb-4 text-sm text-muted">Currently in stock: <span className="font-semibold text-white">{product.stockQty}</span></p>
      <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
        {([["restock", "Restock"], ["waste", "Broken / waste"], ["adjustment", "Stock count"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setReason(v)} className={cx("rounded-lg border px-2 py-2", reason === v ? "border-accent bg-accent/10 text-white" : "border-line bg-raised text-zinc-400")}>{l}</button>
        ))}
      </div>
      <Field label={reason === "adjustment" ? "Actual count on the shelf" : "Quantity"} hint={reason === "adjustment" && qty !== "" ? `Change: ${change > 0 ? "+" : ""}${change}` : undefined}>
        <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
      </Field>
      <div className="mt-3"><Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === "restock" ? "Supplier / invoice no." : "What happened"} maxLength={200} /></Field></div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <Button size="lg" className="mt-5 w-full" disabled={busy || qty === "" || change === 0} onClick={save}>
        {busy ? "Saving…" : `Save · new stock ${product.stockQty + change}`}
      </Button>
    </Modal>
  );
}

function CategoryModal({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = { name: String(f.get("name")), sortOrder: Number(f.get("sortOrder") || 0) };
    await api(category ? `/api/categories/${category.id}` : "/api/categories", { method: category ? "PATCH" : "POST", body }).then(onSaved, (err) => setError(err.message));
  }
  async function remove() {
    if (!category || !confirm(`Delete the ${category.name} category? Its items move to "Other".`)) return;
    await api(`/api/categories/${category.id}`, { method: "DELETE" }).then(onSaved, (err) => setError(err.message));
  }
  return (
    <Modal open onClose={onClose} title={category ? "Edit category" : "New category"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name"><Input name="name" defaultValue={category?.name} required autoFocus placeholder="e.g. Cocktails" /></Field>
        <Field label="Position on menu" hint="Lower numbers show first."><Input name="sortOrder" type="number" min={0} defaultValue={category?.sortOrder ?? 0} /></Field>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {category ? <Button type="button" variant="ghost" className="text-red-400" onClick={remove}><Trash2 size={14} /> Delete</Button> : <span />}
          <Button>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
