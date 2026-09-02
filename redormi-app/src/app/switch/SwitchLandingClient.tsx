"use client";

import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import { useAppData } from "@/lib/store/AppDataContext";
import { computeSwitchTier, TIER_ORDER } from "@/lib/utils/tier";
import { formatDateShort } from "@/lib/utils/format";

const STEPS: { title: string; body: string; icon: IconName }[] = [
  { title: "Enable Switch", body: "Turn on Switch for your listing and share your travel dates and destination wishlist.", icon: "sparkles" },
  { title: "Get your tier", body: "We score your home on property quality, location, and your standing as an owner.", icon: "scale" },
  { title: "Get matched", body: "We surface homes with overlapping dates, mutual interest, and a comparable tier.", icon: "search" },
  { title: "Propose & agree", body: "Send a swap proposal, agree on dates, and both sign the Home Exchange Agreement.", icon: "handshake" },
  { title: "Stay & review", body: "Both homes auto-block the dates, checklists unlock, and you leave reciprocal reviews.", icon: "check-circle" },
];

export default function SwitchLandingClient() {
  const { state, currentUser } = useAppData();
  const switchListings = state.listings.filter((l) => l.switch.enabled && l.status === "published");
  const myListings = currentUser ? state.listings.filter((l) => l.hostId === currentUser.id && l.switch.enabled) : [];

  return (
    <div>
      <section className="bg-sage/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Badge tone="sage" icon={<Icon name="sparkles" className="h-3.5 w-3.5" />}>
            Redormi Switch
          </Badge>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold text-navy sm:text-5xl">
            Swap homes. Skip the rent.
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Two verified owners, two homes, one set of dates. Pay only a processing fee and any add-ons you
            choose — never a nightly rate.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/host/new" variant="switch" size="lg">
              Enable Switch on a home
            </Button>
            <Button href="#browse" variant="outline" size="lg">
              Browse swappable homes
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-2xl font-extrabold text-navy">How Redormi Switch works</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-navy/10 bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-xs font-bold text-navy">
                {i + 1}
              </span>
              <Icon name={s.icon} className="mt-3 h-5 w-5 text-sage-dark" />
              <h3 className="mt-2 text-sm font-bold text-navy">{s.title}</h3>
              <p className="mt-1 text-xs text-ink/60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/60 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-2 text-2xl font-extrabold text-navy">The Switch Tier</h2>
          <p className="mb-8 max-w-2xl text-sm text-ink/60">
            Every Switch-enabled home gets a transparent 1–5 score from three inputs — property type & quality,
            location desirability, and owner standing. We prefer matching equal tiers, but allow a ±1 tier gap
            with a visible notice, which the lower-tier owner can offset with extra services or a small
            balancing payment.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {TIER_ORDER.map((t, i) => (
              <div key={t} className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage/40 text-xs font-bold text-navy">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-navy">{t}</span>
                {i < TIER_ORDER.length - 1 && <Icon name="chevron-right" className="h-4 w-4 text-navy/30" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {myListings.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 text-xl font-extrabold text-navy">Your Switch-enabled homes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myListings.map((l) => {
              const score = computeSwitchTier(l, currentUser);
              return (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-4">
                  <div>
                    <p className="text-sm font-bold text-navy">{l.title}</p>
                    <p className="text-xs text-ink/60">
                      {score.label} tier · {score.composite.toFixed(1)}/5
                    </p>
                  </div>
                  <Link href={`/listing/${l.id}`} className="text-xs font-bold text-coral hover:underline">
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section id="browse" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-2xl font-extrabold text-navy">Browse swappable homes</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {switchListings.map((l) => {
            const host = state.users.find((u) => u.id === l.hostId);
            const score = computeSwitchTier(l, host);
            return (
              <Link
                key={l.id}
                href={`/switch/match/${l.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-navy/10 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photos[0]?.url} alt={l.title} className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
                <div className="flex items-center justify-between">
                  <Badge tone="sage">{score.label}</Badge>
                  <StarRating rating={l.ratingAvg} size="h-3.5 w-3.5" />
                </div>
                <h3 className="line-clamp-1 text-sm font-bold text-navy">{l.title}</h3>
                <p className="text-xs text-ink/60">{l.city}, {l.country}</p>
                {l.switch.travelDatesStart && l.switch.travelDatesEnd && (
                  <p className="text-xs text-ink/50">
                    Open {formatDateShort(l.switch.travelDatesStart)} – {formatDateShort(l.switch.travelDatesEnd)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
