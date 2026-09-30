"use client";

import { useState } from "react";
import type { Review, ReviewSubscores } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/lib/store/ToastContext";
import { submitReview } from "@/lib/supabase/reviews";

const SUBSCORE_LABELS: { key: keyof ReviewSubscores; label: string }[] = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "communication", label: "Communication" },
  { key: "location", label: "Location" },
  { key: "checkIn", label: "Check-in" },
  { key: "value", label: "Value" },
];

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="p-0.5"
        >
          <Icon name="star" className={`h-5 w-5 ${n <= value ? "fill-coral text-coral" : "text-navy/20"}`} />
        </button>
      ))}
    </div>
  );
}

export default function WriteReviewModal({
  open,
  onClose,
  bookingId,
  listingId,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  listingId: string;
  onSubmitted: (review: Review) => void;
}) {
  const toast = useToast();
  const [subscores, setSubscores] = useState<ReviewSubscores>({
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    checkIn: 5,
    value: 5,
  });
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const overall = Math.round((Object.values(subscores).reduce((a, b) => a + b, 0) / 6) * 10) / 10;

  async function submit() {
    setSubmitting(true);
    const { review, error } = await submitReview({ bookingId, listingId, rating: overall, subscores, text });
    setSubmitting(false);
    if (!review) {
      toast?.push({ tone: "error", text: error ?? "Couldn't submit that review — try again." });
      return;
    }
    toast?.push({ tone: "success", text: "Review posted — thanks for sharing!" });
    onSubmitted(review);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Leave a review" size="md">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {SUBSCORE_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-semibold text-navy">{label}</span>
              <StarPicker value={subscores[key]} onChange={(n) => setSubscores((s) => ({ ...s, [key]: n }))} />
            </div>
          ))}
        </div>

        <Textarea
          label="Your review"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How was the stay? What stood out?"
        />

        <Button onClick={submit} fullWidth size="lg" disabled={submitting || text.trim().length === 0}>
          {submitting ? "Posting…" : "Post review"}
        </Button>
      </div>
    </Modal>
  );
}
