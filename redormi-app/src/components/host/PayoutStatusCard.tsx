"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useToast } from "@/lib/store/ToastContext";
import { fetchHostStripeStatus, startConnectOnboarding, type HostStripeStatus } from "@/lib/supabase/payments";

export default function PayoutStatusCard() {
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

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <div className="flex items-center gap-2">
        <Icon name="credit-card" className="h-5 w-5 text-coral" />
        <p className="text-sm font-bold text-navy">Payouts</p>
      </div>

      {status === "loading" ? (
        <p className="mt-2 text-sm text-ink/50">Checking your payout status…</p>
      ) : status?.chargesEnabled ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-sage-dark">
          <Icon name="check-circle" className="h-4 w-4" /> Stripe is connected — you can receive payouts.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink/60">
            {status ? "Almost there — finish setting up Stripe to start receiving payouts." : "Connect a Stripe account so guests' payments can reach your bank account."}
          </p>
          <Button size="sm" className="mt-3" onClick={connect} disabled={connecting}>
            {connecting ? "Redirecting to Stripe…" : status ? "Finish Stripe setup" : "Connect with Stripe"}
          </Button>
        </>
      )}
    </div>
  );
}
