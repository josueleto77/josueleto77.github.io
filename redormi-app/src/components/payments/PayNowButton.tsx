"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/lib/store/ToastContext";
import { startBookingCheckout } from "@/lib/supabase/payments";

export default function PayNowButton({ bookingId }: { bookingId: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const returnUrl = window.location.href;
    const { url, error } = await startBookingCheckout(bookingId, returnUrl, returnUrl);
    if (error || !url) {
      toast?.push({ tone: "error", text: error ?? "Couldn't start checkout — try again." });
      setLoading(false);
      return;
    }
    window.location.href = url;
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "Starting checkout…" : "Pay now"}
    </Button>
  );
}
