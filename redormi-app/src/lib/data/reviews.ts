import type { Review, ReviewSubscores } from "@/lib/types";
import { listings } from "@/lib/data/listings";
import { users } from "@/lib/data/users";
import { addDays } from "@/lib/utils/format";
import { seedToday as isoToday } from "@/lib/utils/seedClock";

const REVIEWERS = users.filter((u) => !u.isHost || u.id === "usr_1");

const TEMPLATES = [
  "Exactly as pictured and then some. {host} left the sweetest welcome note and the {feature} made the whole trip.",
  "We'd book again in a heartbeat. Quiet street, spotless place, and check-in was seamless.",
  "Beautiful space with a few quirks — the {feature} was a little tricky to figure out, but {host} answered right away.",
  "Photos don't do the {feature} justice. Genuinely one of the best stays we've had.",
  "Comfortable beds, great water pressure, and walking distance to everything worth seeing.",
  "Swapped homes with {host} for a week and it felt like staying with a friend — the house manual thought of everything.",
  "A little far from the center than we expected, but the {feature} more than made up for it.",
  "Host was incredibly responsive and the place was cleaner than our own house. Highly recommend.",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function subscoresFrom(rating: number, seed: number): ReviewSubscores {
  const jitter = (n: number) => Math.min(5, Math.max(3.5, Math.round((rating + n) * 10) / 10));
  return {
    cleanliness: jitter(((seed % 3) - 1) * 0.1),
    accuracy: jitter((((seed + 1) % 3) - 1) * 0.1),
    communication: jitter((((seed + 2) % 3) - 1) * 0.1),
    location: jitter((((seed + 3) % 3) - 1) * 0.1),
    checkIn: jitter((((seed + 4) % 3) - 1) * 0.1),
    value: jitter((((seed + 5) % 3) - 1) * 0.1),
  };
}

export const reviews: Review[] = listings.flatMap((listing, li) => {
  const count = 2 + (li % 3);
  const featurePool = listing.amenities.includes("pool")
    ? "pool"
    : listing.amenities.includes("workspace")
      ? "workspace"
      : listing.amenities.includes("hot_tub")
        ? "hot tub"
        : "view";
  return Array.from({ length: count }, (_, ri) => {
    const seed = li * 7 + ri;
    const reviewer = pick(
      REVIEWERS.filter((u) => u.id !== listing.hostId),
      seed
    );
    const rating = Math.max(3.5, Math.min(5, listing.ratingAvg + (((seed % 3) - 1) * 0.2)));
    const isSwitch = listing.switch.enabled && ri === count - 1;
    return {
      id: `rev_${listing.id}_${ri}`,
      listingId: listing.id,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorAvatar: reviewer.avatar,
      rating: Math.round(rating * 20) / 20,
      subscores: subscoresFrom(rating, seed),
      text: pick(TEMPLATES, seed)
        .replace("{host}", listing.hostId === "usr_1" ? "Jordan" : reviewer.name.split(" ")[0])
        .replace("{feature}", featurePool),
      date: addDays(isoToday(), -(20 + seed * 9)),
      stayType: isSwitch ? "switch" : "rent",
    };
  });
});

export function reviewsForListing(listingId: string): Review[] {
  return reviews.filter((r) => r.listingId === listingId);
}
