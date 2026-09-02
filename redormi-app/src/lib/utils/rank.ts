import type { Listing, User } from "@/lib/types";
import { clamp } from "@/lib/utils/format";

/** Hot Places ranking: weighted blend of rating, review volume, booking velocity, host response rate, and repeat-guest rate. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function hotScore(listing: Listing, host: User | undefined): number {
  const ratingComponent = (listing.ratingAvg / 5) * 35;
  const reviewVolumeComponent = clamp(listing.ratingCount / 200, 0, 1) * 15;
  const velocityComponent = clamp(listing.bookingVelocity / 12, 0, 1) * 25;
  const responseComponent = clamp((host?.responseRate ?? 70) / 100, 0, 1) * 10;
  const repeatComponent = clamp(listing.repeatGuestRate, 0, 1) * 15;
  return Math.round(ratingComponent + reviewVolumeComponent + velocityComponent + responseComponent + repeatComponent);
}
