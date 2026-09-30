"use client";

import { useState } from "react";
import type { Booking, CancellationPolicy } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useAppData } from "@/lib/store/AppDataContext";
import { computeRefund, CANCELLATION_POLICY_TEXT } from "@/lib/utils/policy";
import { formatMoney, isoToday } from "@/lib/utils/format";

export default function CancelBookingModal({
  booking,
  cancellationPolicy,
  open,
  onClose,
}: {
  booking: Booking;
  cancellationPolicy: CancellationPolicy;
  open: boolean;
  onClose: () => void;
}) {
  const { cancelBooking } = useAppData();
  const [cancelling, setCancelling] = useState(false);

  const daysUntilCheckIn = Math.floor(
    (new Date(`${booking.checkIn}T00:00:00Z`).getTime() - new Date(`${isoToday()}T00:00:00Z`).getTime()) / 86400000
  );
  const preview =
    booking.paymentStatus === "paid"
      ? computeRefund(booking.total, booking.nightlyRate, cancellationPolicy, daysUntilCheckIn)
      : { refundAmount: 0, refundPct: 0 };

  async function confirm() {
    setCancelling(true);
    await cancelBooking(booking.id);
    setCancelling(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Cancel this booking?" size="sm">
      <div className="flex flex-col gap-4">
        {booking.paymentStatus === "paid" ? (
          <>
            <p className="text-sm text-ink/70">
              This listing has a <span className="font-semibold text-navy">{CANCELLATION_POLICY_TEXT[cancellationPolicy].title}</span> cancellation
              policy: {CANCELLATION_POLICY_TEXT[cancellationPolicy].body}
            </p>
            <div className="rounded-xl bg-cream p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/70">You paid</span>
                <span className="font-semibold text-navy">{formatMoney(booking.total)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-navy/10 pt-2 text-base font-bold text-navy">
                <span>You&apos;ll get back</span>
                <span className={preview.refundAmount > 0 ? "text-sage-dark" : "text-navy"}>
                  {formatMoney(preview.refundAmount)}
                  {preview.refundPct > 0 && preview.refundPct < 100 && ` (${preview.refundPct}%)`}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink/70">This booking hasn&apos;t been paid yet, so there&apos;s nothing to refund — it&apos;ll just be cancelled.</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth disabled={cancelling}>
            Keep booking
          </Button>
          <Button onClick={confirm} fullWidth disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
