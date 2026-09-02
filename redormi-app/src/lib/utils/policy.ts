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
