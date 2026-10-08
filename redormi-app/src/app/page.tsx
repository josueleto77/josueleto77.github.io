import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import TrustBar from "@/components/layout/TrustBar";
import CategoryRow from "@/components/layout/CategoryRow";
import Carousel from "@/components/ui/Carousel";
import ListingCard from "@/components/listing/ListingCard";
import DealCard from "@/components/listing/DealCard";
import Icon from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import { hotPlaces as seedHotPlaces, getListing } from "@/lib/data/listings";
import { lastMinuteDeals } from "@/lib/data/deals";

// Curated "Hot Places" and "Special Offers" rows are sourced straight from
// seed data (no real booking-velocity ranking or host-submitted deals exist
// yet), so — like the rest of the seed listings — they're hidden on a real
// production deployment. See the matching flag in AppDataContext.
const SHOW_SEED_LISTINGS = process.env.NEXT_PUBLIC_SHOW_SEED_LISTINGS !== "false";

export default function Home() {
  const hotPlaces = SHOW_SEED_LISTINGS ? seedHotPlaces : [];
  const deals = SHOW_SEED_LISTINGS ? lastMinuteDeals.slice(0, 4) : [];

  return (
    <div>
      <section className="relative">
        <div className="relative h-44 w-full overflow-hidden sm:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/redormi-hero/1800/900"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/35 to-navy/10" />
          <div className="absolute inset-0 flex items-end pb-7 sm:items-center sm:pb-0">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <h1 className="text-3xl font-extrabold text-white sm:text-5xl">Stay. Rest. Redormi.</h1>
              <p className="mt-1.5 text-base text-white/85 sm:text-lg">Rent a home, or swap one — no rent, ever.</p>
            </div>
          </div>
        </div>

        {/* search card floats over the seam between the hero photo and the page */}
        <div className="relative z-10 mx-auto -mt-7 max-w-5xl px-4 sm:-mt-10 sm:px-6">
          <SearchBar variant="hero" />
        </div>
      </section>

      <CategoryRow />

      <TrustBar />

      {hotPlaces.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold text-navy sm:text-3xl">
                <Icon name="flame" className="h-6 w-6 text-coral" />
                Hot Places
              </h2>
              <p className="mt-1 text-sm text-ink/60">Curated homes with rising demand and top reviews.</p>
            </div>
            <Link href="/hot-places" className="shrink-0 text-sm font-bold text-coral hover:text-coral-dark">
              See all →
            </Link>
          </div>
          <Carousel>
            {hotPlaces.map((listing) => (
              <div key={listing.id} className="w-72 shrink-0">
                <ListingCard listing={listing} />
              </div>
            ))}
          </Carousel>
        </section>
      )}

      {deals.length > 0 && (
        <section className="bg-white/60 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">Special Offers</h2>
                <p className="mt-1 text-sm text-ink/60">Last-minute deals and host promotions, picked for you.</p>
              </div>
              <Link href="/special-offers" className="shrink-0 text-sm font-bold text-coral hover:text-coral-dark">
                See all →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {deals.map((deal) => {
                const listing = getListing(deal.listingId);
                if (!listing) return null;
                return <DealCard key={deal.id} deal={deal} listing={listing} />;
              })}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 rounded-3xl bg-sage/25 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-xs font-bold text-white">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              Redormi Switch
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-navy sm:text-4xl">
              Swap homes. Skip the rent.
            </h2>
            <p className="mt-3 max-w-md text-ink/70">
              Two verified owners, two homes, one set of dates. Pay only a small processing fee and
              optional add-ons — no nightly rate, ever. We rate every home with a transparent Switch
              Tier so matches feel fair.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/switch" variant="switch" size="lg">
                Explore Redormi Switch
              </Button>
              <Button href="/host/new" variant="outline" size="lg">
                List your home
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "handshake" as const, label: "Mutual swap proposals" },
              { icon: "scale" as const, label: "Transparent tier scoring" },
              { icon: "shield-check" as const, label: "Liability & damage add-ons" },
              { icon: "layers" as const, label: "Pre-arrival checklist" },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/10 text-coral">
                  <Icon name={f.icon} className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-2 text-sm font-semibold text-navy">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
