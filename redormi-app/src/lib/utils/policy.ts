import type { CancellationPolicy } from "@/lib/types";

export const CANCELLATION_POLICY_TEXT: Record<CancellationPolicy, { title: string; body: string }> = {
  flexible: {
    title: "Flexible",
    body: "Full refund up to 24 hours before check-in. After that, the first night is non-refundable.",
  },
  moderate: {
    title: "Moderate",
    body: "Full refund up to 5 days before check-in. 50% refund for cancellations made after that, up to 24 hours before check-in.",
  },
  strict: {
    title: "Strict",
    body: "50% refund up to 14 days before check-in. No refund after that, except as required by law.",
  },
};

/**
 * Implements the CANCELLATION_POLICY_TEXT rules above as real numbers.
 * daysUntilCheckIn is whole days between "now" and check-in (0 = check-in
 * is today or has passed). Mirrored in supabase/functions/stripe-cancel-booking
 * (Deno can't import from the Next.js app), so change both together.
 */
export function computeRefund(
  total: number,
  nightlyRate: number,
  policy: CancellationPolicy,
  daysUntilCheckIn: number
): { refundAmount: number; refundPct: number } {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  if (policy === "flexible") {
    if (daysUntilCheckIn >= 1) return { refundAmount: total, refundPct: 100 };
    const refundAmount = round2(Math.max(0, total - nightlyRate));
    return { refundAmount, refundPct: total > 0 ? Math.round((refundAmount / total) * 100) : 0 };
  }
  if (policy === "moderate") {
    if (daysUntilCheckIn >= 5) return { refundAmount: total, refundPct: 100 };
    if (daysUntilCheckIn >= 1) return { refundAmount: round2(total * 0.5), refundPct: 50 };
    return { refundAmount: 0, refundPct: 0 };
  }
  // strict
  if (daysUntilCheckIn >= 14) return { refundAmount: round2(total * 0.5), refundPct: 50 };
  return { refundAmount: 0, refundPct: 0 };
}
