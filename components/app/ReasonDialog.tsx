"use client";

import { useState } from "react";
import { Modal } from "../Modal";
import { Button, Field, Textarea } from "../ui";

/** Asks for a reason before a reject/void; reasons are kept on the record. */
export function ReasonDialog({ open, title, description, confirmLabel, onClose, onConfirm }: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="mb-4 text-sm text-muted">{description}</p>}
      <Field label="Reason">
        <Textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. customer changed their mind" />
      </Field>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          disabled={busy || reason.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onConfirm(reason.trim());
              setReason("");
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
