"use client";

import { useState } from "react";
import type { Dispute, DisputeCategory } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/lib/store/ToastContext";
import { openDispute } from "@/lib/supabase/disputes";

const CATEGORY_LABEL: Record<DisputeCategory, string> = {
  not_as_described: "Not as described",
  damage: "Property damage",
  payment: "Payment issue",
  no_show: "No-show / couldn't check in",
  behavior: "Guest or host behavior",
  other: "Other",
};

export default function OpenDisputeModal({
  open,
  onClose,
  bookingId,
  swapId,
  againstId,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  bookingId?: string;
  swapId?: string;
  againstId: string;
  onOpened: (dispute: Dispute) => void;
}) {
  const toast = useToast();
  const [category, setCategory] = useState<DisputeCategory>("other");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const { dispute, error } = await openDispute({ bookingId, swapId, againstId, category, reason });
    setSubmitting(false);
    if (!dispute) {
      toast?.push({ tone: "error", text: error ?? "Couldn't open that dispute — try again." });
      return;
    }
    toast?.push({ tone: "success", text: "Dispute opened — our team will review it." });
    onOpened(dispute);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Report a problem" size="sm">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-navy">What&apos;s the issue?</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DisputeCategory)}
            className="rounded-xl border border-navy/15 px-3 py-2 text-sm"
          >
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <Textarea label="Details" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" />

        <Button onClick={submit} fullWidth size="lg" disabled={submitting || reason.trim().length === 0}>
          {submitting ? "Submitting…" : "Submit dispute"}
        </Button>
        <p className="text-center text-xs text-ink/50">A Redormi admin will review this and follow up.</p>
      </div>
    </Modal>
  );
}
