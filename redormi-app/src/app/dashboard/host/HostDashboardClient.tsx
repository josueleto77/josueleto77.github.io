"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import EmptyState from "@/components/ui/EmptyState";
import OfferCard from "@/components/offers/OfferCard";
import ExtraServicesManager from "@/components/services/ExtraServicesManager";
import { useAppData } from "@/lib/store/AppDataContext";
import { addDays, formatDateShort, formatMoney, isoToday } from "@/lib/utils/format";
import { computeSwitchTier } from "@/lib/utils/tier";
import { listingHref } from "@/lib/utils/listingHref";

const SWAP_STATUS_TONE: Record<string, "coral" | "sage" | "navy" | "cream"> = {
  proposed: "coral",
  countered: "coral",
  accepted: "sage",
  agreement_pending: "sage",
  confirmed: "sage",
  declined: "navy",
  completed: "navy",
  cancelled: "cream",
};

export default function HostDashboardClient() {
  const params = useSearchParams();
  const { state, currentUser, createDeal } = useAppData();
  const [tab, setTab] = useState(params.get("tab") ?? "listings");

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">Log in to manage your listings</p>
        <Button href="/login" className="mt-4">
          Log in
        </Button>
      </div>
    );
  }

  const myListings = state.listings.filter((l) => l.hostId === currentUser.id);
  const myBookings = state.bookings.filter((b) => myListings.some((l) => l.id === b.listingId));
  const myOffers = state.offers.filter((o) => myListings.some((l) => l.id === o.listingId));
  const mySwaps = state.swaps.filter((s) => s.fromOwnerId === currentUser.id || s.toOwnerId === currentUser.id);

  const rentEarnings = myBookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + b.subtotal + b.cleaningFee, 0);
  const pendingOffersCount = myOffers.filter((o) => o.status === "pending" || o.status === "countered").length;

  if (myListings.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Icon name="home" className="mx-auto h-8 w-8 text-navy/40" />
        <h1 className="mt-3 text-xl font-extrabold text-navy">You haven&apos;t listed a home yet</h1>
        <p className="mt-2 text-sm text-ink/60">Publish your first listing to start hosting on Redormi Rent or Switch.</p>
        <Button href="/host/new" className="mt-5" size="lg">
          List your home
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Host dashboard</h1>
          <p className="text-sm text-ink/60">{myListings.length} listing{myListings.length > 1 ? "s" : ""} · {pendingOffersCount} offer{pendingOffersCount === 1 ? "" : "s"} awaiting reply</p>
        </div>
        <Button href="/host/new" variant="outline" icon={<Icon name="plus" className="h-4 w-4" />}>
          Add listing
        </Button>
      </div>

      <Tabs
        items={[
          { key: "listings", label: "Listings", count: myListings.length },
          { key: "calendar", label: "Calendar" },
          { key: "bookings", label: "Bookings", count: myBookings.length },
          { key: "offers", label: "Offers", count: pendingOffersCount },
          { key: "swaps", label: "Swap requests", count: mySwaps.length },
          { key: "earnings", label: "Earnings" },
          { key: "services", label: "Extra services" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === "listings" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {myListings.map((l) => {
              const score = l.switch.enabled ? computeSwitchTier(l, currentUser) : null;
              return (
                <div key={l.id} className="flex gap-3 rounded-2xl border border-navy/10 bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.photos[0]?.url} alt={l.title} className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={listingHref(l.id)} className="text-sm font-bold text-navy hover:text-coral">
                      {l.title}
                    </Link>
                    <p className="text-xs text-ink/60">{l.city}, {l.country} · {formatMoney(l.pricing.baseNightly)}/night</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {l.acceptsOffers && <Badge tone="cream">Accepts offers</Badge>}
                      {score && <Badge tone="sage">{score.label} tier</Badge>}
                      {!l.availability.length ? (
                        <Badge tone="cream">Fully open</Badge>
                      ) : (
                        <Badge tone="coral">{l.availability.filter((w) => w.blocked).length} blocked window(s)</Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      createDeal({
                        listingId: l.id,
                        start: isoToday(2),
                        end: addDays(isoToday(), 6),
                        discountPercent: 15,
                        expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
                      })
                    }
                    className="h-fit shrink-0 rounded-lg border border-navy/15 px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5"
                    title="Publish a quick 15% last-minute deal (demo)"
                  >
                    + Deal
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "calendar" && (
          <div className="flex flex-col gap-4">
            {myListings.map((l) => (
              <div key={l.id} className="rounded-2xl border border-navy/10 bg-white p-4">
                <p className="text-sm font-bold text-navy">{l.title}</p>
                <p className="text-xs text-ink/50">Stays of {l.minNights}–{l.maxNights} nights.</p>
                {l.availability.length === 0 ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-sage-dark">
                    <Icon name="check-circle" className="h-4 w-4" /> No blocked dates.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/70">
                    {l.availability.map((w) => (
                      <li key={w.start} className="flex items-center gap-1.5">
                        <Icon name="x" className="h-3.5 w-3.5 text-coral" />
                        {formatDateShort(w.start)} – {formatDateShort(w.end)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "bookings" &&
          (myBookings.length === 0 ? (
            <EmptyState icon="calendar" title="No bookings yet" />
          ) : (
            <div className="flex flex-col gap-3">
              {myBookings.map((b) => {
                const listing = myListings.find((l) => l.id === b.listingId);
                const guest = state.users.find((u) => u.id === b.guestId);
                return (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-4">
                    <div>
                      <p className="text-sm font-bold text-navy">{listing?.title}</p>
                      <p className="text-xs text-ink/60">
                        {guest?.name} · {formatDateShort(b.checkIn)} – {formatDateShort(b.checkOut)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-navy">{formatMoney(b.total)}</span>
                      <Badge tone={b.status === "confirmed" || b.status === "completed" ? "sage" : "coral"} className="capitalize">
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {tab === "offers" &&
          (myOffers.length === 0 ? (
            <EmptyState icon="handshake" title="No offers yet" body="When a guest sends an offer on one of your listings, it'll show up here." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {myOffers.map((o) => (
                <OfferCard key={o.id} offer={o} viewAs="host" />
              ))}
            </div>
          ))}

        {tab === "swaps" &&
          (mySwaps.length === 0 ? (
            <EmptyState icon="sparkles" title="No swap requests yet" body="Enable Switch on a listing to start receiving proposals." />
          ) : (
            <div className="flex flex-col gap-3">
              {mySwaps.map((s) => {
                const iAmFrom = s.fromOwnerId === currentUser.id;
                const otherListing = state.listings.find((l) => l.id === (iAmFrom ? s.toListingId : s.fromListingId));
                const myListing = state.listings.find((l) => l.id === (iAmFrom ? s.fromListingId : s.toListingId));
                const otherOwner = state.users.find((u) => u.id === (iAmFrom ? s.toOwnerId : s.fromOwnerId));
                if (!otherListing || !myListing) return null;
                return (
                  <Link
                    key={s.id}
                    href={`/switch/match/${otherListing.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-4 hover:shadow-md"
                  >
                    <div>
                      <p className="text-sm font-bold text-navy">
                        {myListing.title} ↔ {otherListing.title}
                      </p>
                      <p className="text-xs text-ink/60">
                        With {otherOwner?.name} · {formatDateShort(s.proposedStart)} – {formatDateShort(s.proposedEnd)}
                      </p>
                    </div>
                    <Badge tone={SWAP_STATUS_TONE[s.status]} className="capitalize">
                      {s.status.replace("_", " ")}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          ))}

        {tab === "earnings" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Rent earnings (confirmed + completed)" value={formatMoney(rentEarnings)} icon="credit-card" />
            <StatCard label="Confirmed swaps" value={String(mySwaps.filter((s) => s.status === "confirmed").length)} icon="sparkles" />
            <StatCard label="Active listings" value={String(myListings.length)} icon="home" />
          </div>
        )}

        {tab === "services" && <ExtraServicesManager listings={myListings} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: "credit-card" | "sparkles" | "home" }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <Icon name={icon} className="h-5 w-5 text-coral" />
      <p className="mt-3 text-2xl font-extrabold text-navy">{value}</p>
      <p className="text-xs text-ink/60">{label}</p>
    </div>
  );
}
