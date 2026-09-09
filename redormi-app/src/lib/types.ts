// Core data model for Redormi. Mirrors the spec's minimum data model,
// shaped for a typed mock-data / localStorage-backed frontend.

export type Role = "traveler" | "host" | "switch_member";

export type CancellationPolicy = "flexible" | "moderate" | "strict";

export type PropertyType = "studio" | "apartment" | "house" | "villa" | "cabin" | "loft";

export type SwitchTierLabel = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface VerificationDocument {
  id: string;
  userId: string;
  type: "government_id" | "drivers_license" | "selfie";
  status: "unverified" | "pending" | "verified";
  uploadedAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  dateOfBirth?: string;
  address?: string;
  roles: Role[];
  isHost: boolean;
  isSwitchMember: boolean;
  verification: {
    identity: "unverified" | "pending" | "verified";
    email: boolean;
    phone: boolean;
  };
  bio?: string;
  languages?: string[];
  responseRate?: number; // 0-100
  responseTimeMins?: number;
  memberSince: string;
  ratingAvg?: number;
  ratingCount?: number;
  city?: string;
  country?: string;
  twoFactorEnabled?: boolean;
  lastKnownCoords?: { lat: number; lng: number };
}

export interface Amenity {
  id: string;
  label: string;
  icon: string;
  category: "essentials" | "features" | "safety" | "outdoor";
}

export interface Photo {
  id: string;
  url: string;
  alt: string;
  isCover?: boolean;
}

export interface PricingRule {
  baseNightly: number;
  weekendNightly?: number;
  weeklyDiscountPct?: number;
  monthlyDiscountPct?: number;
  cleaningFee: number;
  extraGuestFee?: number;
  serviceFeePct: number; // Redormi service fee
  taxPct: number;
}

export interface AvailabilityWindow {
  start: string; // ISO date
  end: string; // ISO date
  blocked?: boolean;
}

export interface ReviewSubscores {
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  checkIn: number;
  value: number;
}

export interface Review {
  id: string;
  listingId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  subscores: ReviewSubscores;
  text: string;
  date: string;
  stayType: "rent" | "switch";
  hostReply?: string;
}

export interface SwitchProfile {
  enabled: boolean;
  travelDatesStart?: string;
  travelDatesEnd?: string;
  destinationWishlist?: string[];
  tier?: SwitchTierScore;
}

export interface SwitchTierScore {
  propertyScore: number; // 0-5
  locationScore: number; // 0-5
  ownerScore: number; // 0-5
  composite: number; // 0-5
  label: SwitchTierLabel;
  tips: { text: string; delta: number }[];
}

export interface ExtraService {
  id: string;
  listingId: string;
  category: "vehicles" | "recreation" | "comfort" | "services";
  name: string;
  description: string;
  photos: string[];
  pricingUnit: "per_day" | "per_stay" | "per_hour" | "per_item";
  price: number;
  quantityAvailable: number;
  deposit?: number;
  requiresLicense?: boolean;
  ageMinimum?: number;
  cancellationPolicy: CancellationPolicy;
  commissionPct: number;
}

export interface ExtraServiceOrder {
  id: string;
  serviceId: string;
  bookingId?: string;
  swapId?: string;
  guestId: string;
  quantity: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  waiverAccepted?: boolean;
  licenseUploaded?: boolean;
  createdAt: string;
}

export interface Listing {
  id: string;
  hostId: string;
  title: string;
  slug: string;
  description: string;
  propertyType: PropertyType;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  sqft: number;
  yearRenovated: number;
  amenities: string[]; // Amenity ids
  photos: Photo[];
  pricing: PricingRule;
  houseRules: string[];
  cancellationPolicy: CancellationPolicy;
  instantBook: boolean;
  acceptsOffers: boolean;
  autoAcceptThresholdPct?: number;
  autoDeclineFloorPct?: number;
  minNights: number;
  maxNights: number;
  availability: AvailabilityWindow[];
  ratingAvg: number;
  ratingCount: number;
  bookingVelocity: number; // recent bookings / 30d, used for Hot Places
  repeatGuestRate: number; // 0-1
  isHot?: boolean;
  switch: SwitchProfile;
  extraServiceIds: string[];
  status: "published" | "draft";
  createdAt: string;
}

export type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "expired";

export interface Offer {
  id: string;
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  discountPercent: number;
  resultingNightly: number;
  resultingTotal: number;
  message?: string;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
  history: CounterOffer[];
  lastActor: "guest" | "host";
}

export interface CounterOffer {
  id: string;
  offerId: string;
  actor: "guest" | "host";
  discountPercent: number;
  message?: string;
  createdAt: string;
}

export interface LastMinuteDeal {
  id: string;
  listingId: string;
  start: string;
  end: string;
  discountPercent: number;
  expiresAt: string;
  createdAt: string;
  matchedArea?: string;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  area: string;
  geo: { lat: number; lng: number };
  dateRangeStart?: string;
  dateRangeEnd?: string;
  guests?: number;
  timestamp: string;
}

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  nightlyRate: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
  status: "held" | "confirmed" | "completed" | "cancelled";
  fromOfferId?: string;
  extraServiceOrderIds: string[];
  createdAt: string;
}

export type SwapStatus =
  | "proposed"
  | "countered"
  | "accepted"
  | "declined"
  | "agreement_pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface SwapProposal {
  id: string;
  fromListingId: string;
  fromOwnerId: string;
  toListingId: string;
  toOwnerId: string;
  proposedStart: string;
  proposedEnd: string;
  message?: string;
  status: SwapStatus;
  tierGap: number;
  processingFeePerOwner: number;
  createdAt: string;
}

export interface SwapAddOn {
  id: string;
  key: "liability" | "damage_protection" | "cleaning" | "key_handoff" | "cancellation_protection";
  label: string;
  description: string;
  price: number;
  tiers?: { label: string; limit: string; price: number }[];
}

export interface SwapAgreement {
  id: string;
  swapId: string;
  signedByFrom: boolean;
  signedByTo: boolean;
  addOnIds: string[];
  signedAt?: string;
  version: string;
}

export interface MessageThread {
  id: string;
  listingId?: string;
  bookingId?: string;
  swapId?: string;
  participantIds: string[];
  lastMessageAt: string;
  unreadFor: string[]; // userIds with unread messages
  context: "rent" | "switch";
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  sentAt: string;
  readBy: string[];
  isAutomated?: boolean;
  isMasked?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "offer"
    | "counter"
    | "deal"
    | "message"
    | "swap"
    | "booking"
    | "review";
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface LegalDocumentVersion {
  slug: string;
  title: string;
  version: string;
  effectiveDate: string;
}

export interface AcceptanceRecord {
  id: string;
  userId: string;
  documentSlug: string;
  version: string;
  acceptedAt: string;
  ip: string;
}

export interface Dispute {
  id: string;
  bookingId?: string;
  swapId?: string;
  raisedById: string;
  reason: string;
  status: "open" | "reviewing" | "resolved";
  createdAt: string;
}
