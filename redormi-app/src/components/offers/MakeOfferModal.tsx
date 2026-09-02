"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import RangeSlider from "@/components/ui/RangeSlider";
import { Textarea } from "@/components/ui/Input";
import { useAppData } from "@/lib/store/AppDataContext";
import { priceBreakdown } from "@/lib/utils/pricing";
import { formatMoney, isoToday, nightsBetween } from "@/lib/utils/format";
import { seedToday } from "@/lib/utils/seedClock";
import { OFFER_DISCOUNT_PRESETS, OFFER_MAX_DISCOUNT, OFFER_MIN_DISCOUNT } from "@/lib/utils/pricing";

export default function MakeOfferModal({
  listing,
  open,
  onClose,
  checkIn,
  checkOut,
}: {
  listing: Listing;
  open: boolean;
  onClose: () => void;
  checkIn?: string;
  checkOut?: string;
}) {
  const router = useRouter();
  const { currentUser, createOffer } = useAppData();
  const [dates, setDates] = useState({
    checkIn: checkIn ?? seedToday(3),
    checkOut: checkOut ?? seedToday(3 + listing.minNights),
  });
  const [discount, setDiscount] = useState(10);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (checkIn || checkOut) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: see the seedToday() comment above.
    setDates({ checkIn: isoToday(3), checkOut: isoToday(3 + listing.minNights) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nights = Math.max(listing.minNights, nightsBetween(dates.checkIn, dates.checkOut));
  const breakdown = useMemo(() => priceBreakdown(listing.pricing, nights, discount), [listing.pricing, nights, discount]);

  function submit() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    createOffer({
      listingId: listing.id,
      guestId: currentUser.id,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      discountPercent: discount,
      resultingNightly: breakdown.nightlyRate,
      resultingTotal: breakdown.total,
      message: message || undefined,
    });
    setSent(true);
  }

  return (
    <Modal open={open} onClose={onClose} title={sent ? "Offer sent" : "Make an offer"} size="md">
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-ink/70">
            Your offer for {formatMoney(breakdown.total)} total ({discount}% off) was sent to the host. Offers
            expire in 48 hours if there&apos;s no response.
          </p>
          <Button
            onClick={() => {
              onClose();
              router.push("/dashboard/guest?tab=offers");
            }}
          >
            View my offers
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-navy">Check in</span>
              <input
                type="date"
                value={dates.checkIn}
                min={isoToday()}
                onChange={(e) => setDates((d) => ({ ...d, checkIn: e.target.value }))}
                className="rounded-xl border border-navy/15 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-navy">Check out</span>
              <input
                type="date"
                value={dates.checkOut}
                min={dates.checkIn}
                onChange={(e) => setDates((d) => ({ ...d, checkOut: e.target.value }))}
                className="rounded-xl border border-navy/15 px-3 py-2"
              />
            </label>
          </div>

          <div>
            <div className="mb-2 flex gap-2">
              {OFFER_DISCOUNT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDiscount(p)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    discount === p ? "border-coral bg-coral text-white" : "border-navy/15 text-navy"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <RangeSlider
              min={OFFER_MIN_DISCOUNT}
              max={OFFER_MAX_DISCOUNT}
              value={discount}
              onChange={setDiscount}
              label="Discount requested"
              formatValue={(v) => `${v}%`}
            />
          </div>

          <div className="rounded-xl bg-cream p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/70">
                {formatMoney(breakdown.nightlyRate)} × {nights} nights
              </span>
              <span className="font-semibold text-navy">{formatMoney(breakdown.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink/70">
              <span>Cleaning fee</span>
              <span>{formatMoney(breakdown.cleaningFee)}</span>
            </div>
            <div className="flex justify-between text-ink/70">
              <span>Service fee</span>
              <span>{formatMoney(breakdown.serviceFee)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-navy/10 pt-2 text-base font-bold text-navy">
              <span>Your offer total</span>
              <span className="text-coral">{formatMoney(breakdown.total)}</span>
            </div>
            <p className="mt-1 text-xs text-ink/50">
              Regular price {formatMoney(priceBreakdown(listing.pricing, nights).total)} — you&apos;re asking for{" "}
              {discount}% off the nightly rate.
            </p>
          </div>

          <Textarea
            label="Message to host (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share why this trip matters, or how flexible you can be on dates."
          />

          <Button onClick={submit} fullWidth size="lg">
            Send offer
          </Button>
          <p className="text-center text-xs text-ink/50">Offers expire automatically after 48 hours.</p>
        </div>
      )}
    </Modal>
  );
}
