"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useToast } from "@/lib/store/ToastContext";
import { fetchIdentityVerificationStatus, startIdentityVerification, type IdentityVerificationStatus } from "@/lib/supabase/identity";

const IN_PROGRESS_STATUSES = new Set(["In Progress", "In Review", "not_started", "Not Started"]);

export default function IdentityVerificationCard({ userId }: { userId: string }) {
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

  const isApproved = status !== "loading" && status?.status === "Approved";
  const isDeclined = status !== "loading" && status?.status === "Declined";
  const isPending = status !== "loading" && status !== null && IN_PROGRESS_STATUSES.has(status.status) && status.status !== "not_started";

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <div className="flex items-center gap-2">
        <Icon name="shield-check" className="h-5 w-5 text-coral" />
        <p className="text-sm font-bold text-navy">Identity verification</p>
      </div>

      {status === "loading" ? (
        <p className="mt-2 text-sm text-ink/50">Checking your verification status…</p>
      ) : isApproved ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-sage-dark">
          <Icon name="check-circle" className="h-4 w-4" /> Your identity is verified.
        </p>
      ) : isPending ? (
        <p className="mt-2 text-sm text-ink/60">Your verification is being reviewed — this usually takes just a few minutes.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink/60">
            {isDeclined
              ? "Your last verification attempt wasn't approved. You can try again with a valid government ID."
              : "Verify your identity with a government ID and a quick selfie so hosts and guests can trust who they're dealing with."}
          </p>
          <Button size="sm" className="mt-3" onClick={start} disabled={starting}>
            {starting ? "Redirecting…" : isDeclined ? "Try verification again" : "Verify my identity"}
          </Button>
        </>
      )}
    </div>
  );
}
