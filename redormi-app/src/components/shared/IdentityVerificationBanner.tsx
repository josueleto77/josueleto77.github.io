"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useToast } from "@/lib/store/ToastContext";
import { fetchIdentityVerificationStatus, startIdentityVerification, type IdentityVerificationStatus } from "@/lib/supabase/identity";

/** Slim dashboard nudge — the full card with status detail lives on /account. */
export default function IdentityVerificationBanner({ userId }: { userId: string }) {
  const toast = useToast();
  const [status, setStatus] = useState<IdentityVerificationStatus | null | "loading">("loading");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchIdentityVerificationStatus(userId).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function start() {
    setStarting(true);
    const { url, error } = await startIdentityVerification(window.location.href);
    if (error || !url) {
      toast?.push({ tone: "error", text: error ?? "Couldn't start identity verification — try again." });
      setStarting(false);
      return;
    }
    window.location.href = url;
  }

  if (status === "loading" || status?.status === "Approved") return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coral/20 bg-coral/5 p-4">
      <div className="flex items-center gap-2">
        <Icon name="shield-check" className="h-5 w-5 text-coral" />
        <p className="text-sm text-navy">
          <span className="font-bold">Verify your identity</span> — builds trust with hosts and guests.
        </p>
      </div>
      <Button size="sm" onClick={start} disabled={starting}>
        {starting ? "Redirecting…" : "Verify now"}
      </Button>
    </div>
  );
}
