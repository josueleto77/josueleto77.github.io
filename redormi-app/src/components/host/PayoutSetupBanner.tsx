"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useToast } from "@/lib/store/ToastContext";
import { fetchHostStripeStatus, startConnectOnboarding, type HostStripeStatus } from "@/lib/supabase/payments";

/** Slim dashboard nudge — the full status card lives in the Earnings tab. */
export default function PayoutSetupBanner() {
  const toast = useToast();
  const [status, setStatus] = useState<HostStripeStatus | null | "loading">("loading");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHostStripeStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setConnecting(true);
    const { url, error } = await startConnectOnboarding(window.location.href);
    if (error || !url) {
      toast?.push({ tone: "error", text: error ?? "Couldn't start Stripe onboarding — try again." });
      setConnecting(false);
      return;
    }
    window.location.href = url;
  }

  if (status === "loading" || status?.chargesEnabled) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coral/20 bg-coral/5 p-4">
      <div className="flex items-center gap-2">
        <Icon name="credit-card" className="h-5 w-5 text-coral" />
        <p className="text-sm text-navy">
          <span className="font-bold">Connect a payout method</span> to start receiving bookings.
        </p>
      </div>
      <Button size="sm" onClick={connect} disabled={connecting}>
        {connecting ? "Redirecting…" : status ? "Finish Stripe setup" : "Connect with Stripe"}
      </Button>
    </div>
  );
}
