import { supabase, LISTING_PHOTOS_BUCKET } from "@/lib/supabase/client";
import type { Listing, Photo, PricingRule, PropertyType, CancellationPolicy } from "@/lib/types";

interface ListingRow {
  id: string;
  host_id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  city: string;
  region: string;
  country: string;
  lat: number | null;
  lng: number | null;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
  photos: { url: string; alt?: string }[];
  pricing: Partial<PricingRule>;
  house_rules: string[];
  cancellation_policy: CancellationPolicy;
  instant_book: boolean;
  accepts_offers: boolean;
  min_nights: number;
  max_nights: number;
  switch_enabled: boolean;
  status: "published" | "draft";
  created_at: string;
}

export function mapDbListingToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    hostId: row.host_id,
    title: row.title,
    slug: row.id,
    description: row.description,
    propertyType: row.property_type,
    city: row.city,
    region: row.region,
    country: row.country,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    guests: row.guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    baths: row.baths,
    sqft: 0,
    yearRenovated: new Date(row.created_at).getFullYear(),
    amenities: row.amenities ?? [],
    photos: (row.photos ?? []).map((p, i) => ({
      id: `${row.id}_photo_${i}`,
      url: p.url,
      alt: p.alt ?? row.title,
      isCover: i === 0,
    })) as Photo[],
    pricing: {
      baseNightly: row.pricing?.baseNightly ?? 0,
      weekendNightly: row.pricing?.weekendNightly,
      weeklyDiscountPct: row.pricing?.weeklyDiscountPct,
      monthlyDiscountPct: row.pricing?.monthlyDiscountPct,
      cleaningFee: row.pricing?.cleaningFee ?? 0,
      extraGuestFee: row.pricing?.extraGuestFee,
      serviceFeePct: row.pricing?.serviceFeePct ?? 12,
      taxPct: row.pricing?.taxPct ?? 0,
    },
    houseRules: row.house_rules ?? [],
    cancellationPolicy: row.cancellation_policy,
    instantBook: row.instant_book,
    acceptsOffers: row.accepts_offers,
    minNights: row.min_nights,
    maxNights: row.max_nights,
    availability: [],
    ratingAvg: 0,
    ratingCount: 0,
    bookingVelocity: 0,
    repeatGuestRate: 0,
    switch: { enabled: row.switch_enabled },
    extraServiceIds: [],
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function fetchPublishedListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(mapDbListingToListing);
}

export async function fetchListingsByHost(hostId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ListingRow[]).map(mapDbListingToListing);
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapDbListingToListing(data as ListingRow);
}

export async function uploadListingPhotos(files: File[], hostId: string): Promise<{ url: string; alt: string }[]> {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const path = `${hostId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from(LISTING_PHOTOS_BUCKET).upload(path, file);
      if (error) return null;
      const { data } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, alt: file.name };
    })
  );
  return uploads.filter((u): u is { url: string; alt: string } => u !== null);
}

export interface NewListingInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  city: string;
  region: string;
  country: string;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
  photos: { url: string; alt: string }[];
  pricing: PricingRule;
  houseRules: string[];
  cancellationPolicy: CancellationPolicy;
  instantBook: boolean;
  acceptsOffers: boolean;
  minNights: number;
  maxNights: number;
  switchEnabled: boolean;
}

export async function createListingInSupabase(input: NewListingInput, hostId: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .insert({
      host_id: hostId,
      title: input.title,
      description: input.description,
      property_type: input.propertyType,
      city: input.city,
      region: input.region,
      country: input.country,
      guests: input.guests,
      bedrooms: input.bedrooms,
      beds: input.beds,
      baths: input.baths,
      amenities: input.amenities,
      photos: input.photos,
      pricing: input.pricing,
      house_rules: input.houseRules,
      cancellation_policy: input.cancellationPolicy,
      instant_book: input.instantBook,
      accepts_offers: input.acceptsOffers,
      min_nights: input.minNights,
      max_nights: input.maxNights,
      switch_enabled: input.switchEnabled,
      status: "published",
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapDbListingToListing(data as ListingRow);
}
