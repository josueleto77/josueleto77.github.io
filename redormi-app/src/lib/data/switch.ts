import type { SwapAddOn, SwapAgreement, SwapProposal } from "@/lib/types";
import { getListing } from "@/lib/data/listings";
import { switchProcessingFee } from "@/lib/utils/pricing";
import { nightsBetween } from "@/lib/utils/format";
import { SEED_NOW_MS, seedHoursAgo } from "@/lib/utils/seedClock";

export const swapAddOns: SwapAddOn[] = [
  {
    id: "addon_liability",
    key: "liability",
    label: "General Liability coverage",
    description: "Covers third-party injury or property damage claims that happen during the swap.",
    price: 39,
    tiers: [
      { label: "Standard", limit: "$100,000 limit", price: 39 },
      { label: "Plus", limit: "$300,000 limit", price: 69 },
      { label: "Max", limit: "$1,000,000 limit", price: 119 },
    ],
  },
  {
    id: "addon_damage",
    key: "damage_protection",
    label: "Damage protection / deposit hold",
    description: "A refundable hold in lieu of a cash security deposit, released after both check-outs.",
    price: 25,
    tiers: [
      { label: "Basic", limit: "$1,000 hold", price: 25 },
      { label: "Extended", limit: "$3,000 hold", price: 45 },
    ],
  },
  {
    id: "addon_cleaning",
    key: "cleaning",
    label: "Professional cleaning",
    description: "A vetted local cleaner preps each home before arrival and after departure.",
    price: 60,
  },
  {
    id: "addon_key",
    key: "key_handoff",
    label: "Verified key handoff / lockbox",
    description: "Redormi ships and manages a smart lockbox so neither side has to coordinate keys in person.",
    price: 30,
  },
  {
    id: "addon_cancellation",
    key: "cancellation_protection",
    label: "Cancellation protection",
    description: "Refunds your processing fee and add-ons if the other party cancels within 14 days of check-in.",
    price: 19,
  },
];

interface SwapSeed {
  id: string;
  fromListingId: string;
  toListingId: string;
  startOffset: number;
  nights: number;
  status: SwapProposal["status"];
  message?: string;
  tierGap: number;
  createdHoursAgo: number;
}

const seeds: SwapSeed[] = [
  {
    id: "sp_1",
    fromListingId: "lst_23",
    toListingId: "lst_18",
    startOffset: 50,
    nights: 14,
    status: "countered",
    message: "Loved your loft's photos — would you be open to swapping with our Marais apartment June 10–24?",
    tierGap: 0.3,
    createdHoursAgo: 22,
  },
  {
    id: "sp_2",
    fromListingId: "lst_20",
    toListingId: "lst_10",
    startOffset: 20,
    nights: 14,
    status: "confirmed",
    message: "Our Tulum place for your Ubud villa — same dates work great for us.",
    tierGap: 0.1,
    createdHoursAgo: 240,
  },
  {
    id: "sp_3",
    fromListingId: "lst_4",
    toListingId: "lst_1",
    startOffset: 25,
    nights: 14,
    status: "proposed",
    message: "Would you and your family like to swap Lisbon for Barcelona this spring?",
    tierGap: 0.4,
    createdHoursAgo: 6,
  },
];

export const swapProposals: SwapProposal[] = seeds.map((s) => {
  const from = getListing(s.fromListingId)!;
  const to = getListing(s.toListingId)!;
  const proposedStart = new Date(SEED_NOW_MS + s.startOffset * 86400000).toISOString().slice(0, 10);
  const proposedEnd = new Date(SEED_NOW_MS + (s.startOffset + s.nights) * 86400000).toISOString().slice(0, 10);
  return {
    id: s.id,
    fromListingId: s.fromListingId,
    fromOwnerId: from.hostId,
    toListingId: s.toListingId,
    toOwnerId: to.hostId,
    proposedStart,
    proposedEnd,
    message: s.message,
    status: s.status,
    tierGap: s.tierGap,
    processingFeePerOwner: switchProcessingFee(nightsBetween(proposedStart, proposedEnd)),
    createdAt: seedHoursAgo(s.createdHoursAgo),
  };
});

export const swapAgreements: SwapAgreement[] = [
  {
    id: "agr_2",
    swapId: "sp_2",
    signedByFrom: true,
    signedByTo: true,
    addOnIds: ["addon_liability", "addon_cleaning", "addon_key"],
    signedAt: seedHoursAgo(200),
    version: "1.0",
  },
];

export function swapById(id: string): SwapProposal | undefined {
  return swapProposals.find((s) => s.id === id);
}

export function swapsForUser(userId: string): SwapProposal[] {
  return swapProposals.filter((s) => s.fromOwnerId === userId || s.toOwnerId === userId);
}

export function agreementForSwap(swapId: string): SwapAgreement | undefined {
  return swapAgreements.find((a) => a.swapId === swapId);
}
