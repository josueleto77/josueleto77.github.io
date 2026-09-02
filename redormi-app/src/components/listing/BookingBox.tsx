"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing } from "@/lib/types";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import MakeOfferModal from "@/components/offers/MakeOfferModal";
import { useAppData } from "@/lib/store/AppDataContext";
import { priceBreakdown } from "@/lib/utils/pricing";
import { formatMoney, isoToday, nightsBetween } from "@/lib/utils/format";
import { seedToday } from "@/lib/utils/seedClock";
import { dealForListing } from "@/lib/data/deals";

export default function BookingBox({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { currentUser, createBooking, ensureThread } = useAppData();
  // Seeded placeholders keep the first client render identical to the
  // statically-prerendered HTML; the real "today"-based default (which
  // would otherwise differ from build time) is swapped in right after
  // mount so it never causes a hydration mismatch.
  const [checkIn, setCheckIn] = useState(seedToday(7));
  const [checkOut, setCheckOut] = useState(seedToday(7 + listing.minNights));
  const [guests, setGuests] = useState(2);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: see the seedToday() comment above.
    setCheckIn(isoToday(7));
    setCheckOut(isoToday(7 + listing.minNights));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deal = dealForListing(listing.id);
  const nights = Math.max(listing.minNights, nightsBetween(checkIn, checkOut));
  const breakdown = useMemo(
    () => priceBreakdown(listing.pricing, nights, deal?.discountPercent ?? 0),
    [listing.pricing, nights, deal]
  );

  function reserve() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    createBooking({
      listingId: listing.id,
      guestId: currentUser.id,
      checkIn,
      checkOut,
      guests,
      nights,
      nightlyRate: breakdown.nightlyRate,
      subtotal: breakdown.subtotal,
      cleaningFee: breakdown.cleaningFee,
      serviceFee: breakdown.serviceFee,
      taxes: breakdown.taxes,
      total: breakdown.total,
    });
    router.push("/dashboard/guest?tab=trips");
  }

  function contactHost() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const threadId = ensureThread(listing.id, listing.hostId, "rent");
    router.push(`/messages?thread=${threadId}`);
  }

  return (
    <div className="sticky top-20 flex flex-col gap-4 rounded-2xl border border-navy/10 bg-white p-5 shadow-lg">
      <div className="flex items-baseline justify-between">
        <p>
          <span className="text-xl font-extrabold text-navy">{formatMoney(breakdown.nightlyRate)}</span>{" "}
          <span className="text-sm text-ink/60">/ night</span>
        </p>
        {listing.instantBook && (
          <span className="flex items-center gap-1 text-xs font-bold text-sage-dark">
            <Icon name="check-circle" className="h-3.5 w-3.5" /> Instant Book
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-navy/10 rounded-xl border border-navy/15">
        <label className="flex flex-col px-3 py-2">
          <span className="text-[10px] font-bold uppercase text-navy/40">Check in</span>
          <input
            type="date"
            value={checkIn}
            min={isoToday()}
            onChange={(e) => setCheckIn(e.target.value)}
            className="bg-transparent text-sm font-semibold text-navy outline-none"
          />
        </label>
        <label className="flex flex-col px-3 py-2">
          <span className="text-[10px] font-bold uppercase text-navy/40">Check out</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="bg-transparent text-sm font-semibold text-navy outline-none"
          />
        </label>
      </div>
      <label className="flex items-center justify-between rounded-xl border border-navy/15 px-3 py-2">
        <span className="text-[10px] font-bold uppercase text-navy/40">Guests</span>
        <input
          type="number"
          min={1}
          max={listing.guests}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-16 bg-transparent text-right text-sm font-semibold text-navy outline-none"
        />
      </label>

      <Button onClick={reserve} size="lg" fullWidth>
        Reserve
      </Button>
      {listing.acceptsOffers && (
        <Button onClick={() => setOfferOpen(true)} variant="outline" size="lg" fullWidth>
          Make an offer
        </Button>
      )}
      <button onClick={contactHost} className="flex items-center justify-center gap-1.5 text-sm font-semibold text-navy hover:text-coral">
        <Icon name="message" className="h-4 w-4" />
        Contact host
      </button>

      <p className="text-center text-xs text-ink/50">You won&apos;t be charged yet</p>

      <div className="flex flex-col gap-2 border-t border-navy/10 pt-4 text-sm">
        <div className="flex justify-between text-ink/70">
          <span>
            {formatMoney(breakdown.nightlyRate)} × {nights} nights
          </span>
          <span>{formatMoney(breakdown.subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Cleaning fee</span>
          <span>{formatMoney(breakdown.cleaningFee)}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Service fee</span>
          <span>{formatMoney(breakdown.serviceFee)}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Taxes</span>
          <span>{formatMoney(breakdown.taxes)}</span>
        </div>
        <div className="flex justify-between border-t border-navy/10 pt-2 text-base font-bold text-navy">
          <span>Total</span>
          <span>{formatMoney(breakdown.total)}</span>
        </div>
      </div>

      <MakeOfferModal listing={listing} open={offerOpen} onClose={() => setOfferOpen(false)} checkIn={checkIn} checkOut={checkOut} />
    </div>
  );
}
