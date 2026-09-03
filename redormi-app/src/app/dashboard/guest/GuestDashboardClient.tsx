"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ListingCard from "@/components/listing/ListingCard";
import OfferCard from "@/components/offers/OfferCard";
import ExtraServiceCard from "@/components/services/ExtraServiceCard";
import { useAppData } from "@/lib/store/AppDataContext";
import { formatDateShort, formatMoney } from "@/lib/utils/format";

const STATUS_TONE: Record<string, "coral" | "sage" | "navy" | "cream"> = {
  held: "coral",
  confirmed: "sage",
  completed: "navy",
  cancelled: "cream",
};

export default function GuestDashboardClient() {
  const params = useSearchParams();
  const { state, currentUser } = useAppData();
  const [tab, setTab] = useState(params.get("tab") ?? "trips");

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">Log in to see your trips</p>
        <Button href="/login" className="mt-4">
          Log in
        </Button>
      </div>
    );
  }

  const trips = state.bookings.filter((b) => b.guestId === currentUser.id);
  const offersSent = state.offers.filter((o) => o.guestId === currentUser.id);
  const savedIds = state.saved[currentUser.id] ?? [];
  const savedListings = state.listings.filter((l) => savedIds.includes(l.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-extrabold text-navy">Welcome back, {currentUser.name.split(" ")[0]}</h1>
      <p className="mb-6 text-sm text-ink/60">Your trips, offers, saved homes, and messages.</p>

      <Tabs
        items={[
          { key: "trips", label: "Trips", count: trips.length },
          { key: "offers", label: "Offers sent", count: offersSent.length },
          { key: "saved", label: "Saved homes", count: savedListings.length },
          { key: "messages", label: "Messages" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === "trips" &&
          (trips.length === 0 ? (
            <EmptyState icon="calendar" title="No trips yet" body="Book a stay to see it here." action={<Button href="/search" className="mt-2">Browse homes</Button>} />
          ) : (
            <div className="flex flex-col gap-4">
              {trips.map((b) => {
                const listing = state.listings.find((l) => l.id === b.listingId);
                if (!listing) return null;
                const services = state.extraServices.filter((s) => s.listingId === listing.id);
                return (
                  <div key={b.id} className="rounded-2xl border border-navy/10 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={listing.photos[0]?.url} alt={listing.title} className="h-20 w-24 rounded-xl object-cover" />
                      <div className="flex-1">
                        <Link href={`/listing/${listing.id}`} className="text-sm font-bold text-navy hover:text-coral">
                          {listing.title}
                        </Link>
                        <p className="text-xs text-ink/60">
                          {formatDateShort(b.checkIn)} – {formatDateShort(b.checkOut)} · {b.guests} guests
                        </p>
                        <p className="text-sm font-bold text-navy">{formatMoney(b.total)}</p>
                      </div>
                      <Badge tone={STATUS_TONE[b.status]} className="capitalize">
                        {b.status}
                      </Badge>
                    </div>
                    {services.length > 0 && (b.status === "held" || b.status === "confirmed") && (
                      <div className="mt-4 border-t border-navy/10 pt-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy/50">Add extra services to this trip</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {services.map((s) => (
                            <ExtraServiceCard key={s.id} service={s} bookingId={b.id} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

        {tab === "offers" &&
          (offersSent.length === 0 ? (
            <EmptyState icon="handshake" title="No offers sent" body="Open any listing that accepts offers to propose a discount." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {offersSent.map((o) => (
                <OfferCard key={o.id} offer={o} viewAs="guest" />
              ))}
            </div>
          ))}

        {tab === "saved" &&
          (savedListings.length === 0 ? (
            <EmptyState icon="heart" title="No saved homes yet" body="Tap the heart on any listing to save it here." />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {savedListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ))}

        {tab === "messages" && (
          <EmptyState icon="message" title="Head to your inbox" body="All conversations with hosts and swap partners live in Messages." action={<Button href="/messages" className="mt-2">Open messages</Button>} />
        )}
      </div>
    </div>
  );
}
