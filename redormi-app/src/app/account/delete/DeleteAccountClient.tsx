"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store/AppDataContext";
import { requestAccountDeletion } from "@/lib/supabase/accountDeletion";
import Button from "@/components/ui/Button";
import Input, { Textarea } from "@/components/ui/Input";

export default function DeleteAccountClient() {
  const { currentUser, state } = useAppData();
  const hasSupabaseSession = state.hasSupabaseSession;
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) {
      setError("Enter the email address on your Redormi account.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: reqError } = await requestAccountDeletion(email.trim(), reason.trim(), hasSupabaseSession ? currentUser?.id : undefined);
    setSubmitting(false);
    if (reqError) {
      setError("Something went wrong submitting your request — please try again or email us directly.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold text-navy">Delete your account</h1>
      <p className="mt-2 text-sm text-ink/60">
        You can request deletion of your Redormi account and personal data at any time, whether or not you still
        have access to the app.
      </p>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-navy/10 bg-navy/[0.02] p-5 text-sm text-ink/70">
        <p className="font-semibold text-navy">What happens when you request deletion</p>
        <ul className="flex flex-col gap-1.5 pl-4 list-disc">
          <li>
            We delete your profile, saved homes, messages, and account credentials within 30 days of confirming
            your request.
          </li>
          <li>
            Records tied to a completed booking or swap (receipts, payout records, dispute history) are kept for up
            to seven years where required for tax, accounting, or legal reasons, as described in our{" "}
            <a href="/legal/terms#privacy-policy" className="font-semibold text-coral hover:underline">
              Privacy Policy
            </a>
            .
          </li>
          <li>We&apos;ll email you to confirm your identity before deleting anything.</li>
        </ul>
      </div>

      {submitted ? (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-semibold">Request received.</p>
          <p className="mt-1">
            We&apos;ll email {email} to confirm your identity, then process the deletion within 30 days.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          <Input
            label="Email on your Redormi account"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={hasSupabaseSession}
            required
          />
          <Textarea
            label="Anything we should know? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional — tell us why you're leaving or any details that help us process this faster."
          />
          {error && <p className="text-xs font-semibold text-coral-dark">{error}</p>}
          <Button onClick={submit} fullWidth size="lg" disabled={submitting}>
            {submitting ? "Submitting…" : "Request account deletion"}
          </Button>
          <p className="text-center text-xs text-ink/50">
            Prefer email? Write to{" "}
            <a href="mailto:support@redormi.com" className="font-semibold text-coral hover:underline">
              support@redormi.com
            </a>{" "}
            with the subject &quot;Delete my account&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
