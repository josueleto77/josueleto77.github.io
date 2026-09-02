"use client";

import { useState } from "react";
import Link from "next/link";
import type { Offer } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RangeSlider from "@/components/ui/RangeSlider";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { formatDateShort, formatMoney } from "@/lib/utils/format";
import { useCountdownText } from "@/lib/utils/useClientOnly";
import { OFFER_MAX_DISCOUNT, OFFER_MIN_DISCOUNT } from "@/lib/utils/pricing";

const STATUS_TONE: Record<Offer["status"], "coral" | "sage" | "navy" | "cream"> = {
  pending: "coral",
  countered: "cream",
  accepted: "sage",
  declined: "navy",
  expired: "navy",
};

export default function OfferCard({ offer, viewAs }: { offer: Offer; viewAs: "guest" | "host" }) {
  const { state, respondOffer, counterOffer } = useAppData();
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterPct, setCounterPct] = useState(offer.discountPercent);
  const expiresText = useCountdownText(offer.expiresAt);

  const listing = state.listings.find((l) => l.id === offer.listingId);
  const otherUser = state.users.find((u) => u.id === (viewAs === "guest" ? listing?.hostId : offer.guestId));
  const isActionable = offer.status === "pending" || (offer.status === "countered" && offer.lastActor !== viewAs);

  if (!listing) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/listing/${listing.id}`} className="text-sm font-bold text-navy hover:text-coral">
            {listing.title}
          </Link>
          <p className="text-xs text-ink/60">
            {formatDateShort(offer.checkIn)} – {formatDateShort(offer.checkOut)}
            {otherUser ? ` · ${viewAs === "guest" ? "Host" : "Guest"}: ${otherUser.name}` : ""}
          </p>
        </div>
        <Badge tone={STATUS_TONE[offer.status]} className="capitalize">
          {offer.status}
        </Badge>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-lg font-extrabold text-coral">{offer.discountPercent}% off</span>
        <span className="text-sm text-ink/60">→ {formatMoney(offer.resultingTotal)} total</span>
      </div>

      {offer.message && <p className="rounded-lg bg-cream p-2.5 text-xs text-ink/70">&ldquo;{offer.message}&rdquo;</p>}

      {offer.history.length > 0 && (
        <div className="flex flex-col gap-1 border-l-2 border-navy/10 pl-3 text-xs text-ink/60">
          {offer.history.map((h) => (
            <p key={h.id}>
              <span className="font-semibold capitalize text-navy">{h.actor}</span> countered at {h.discountPercent}%
              {h.message ? ` — "${h.message}"` : ""}
            </p>
          ))}
        </div>
      )}

      {offer.status === "pending" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-coral-dark">
          <Icon name="clock" className="h-3.5 w-3.5" />
          {expiresText ?? "…"}
        </p>
      )}

      {isActionable && viewAs === "host" && (
        <div className="flex flex-col gap-2">
          {counterOpen ? (
            <div className="flex flex-col gap-2 rounded-xl bg-cream p-3">
              <RangeSlider
                min={OFFER_MIN_DISCOUNT}
                max={OFFER_MAX_DISCOUNT}
                value={counterPct}
                onChange={setCounterPct}
                label="Counter at"
                formatValue={(v) => `${v}%`}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    counterOffer(offer.id, "host", counterPct);
                    setCounterOpen(false);
                  }}
                >
                  Send counter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCounterOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => respondOffer(offer.id, "accepted")}>
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCounterOpen(true)}>
                Counter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => respondOffer(offer.id, "declined")}>
                Decline
              </Button>
            </div>
          )}
        </div>
      )}

      {isActionable && viewAs === "guest" && offer.status === "countered" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => respondOffer(offer.id, "accepted")}>
            Accept {offer.discountPercent}%
          </Button>
          <Button size="sm" variant="ghost" onClick={() => respondOffer(offer.id, "declined")}>
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
