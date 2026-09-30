import { supabase } from "@/lib/supabase/client";
import type { Review, ReviewSubscores } from "@/lib/types";

interface ReviewRow {
  id: string;
  booking_id: string;
  listing_id: string;
  author_id: string;
  rating: number;
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  check_in: number;
  value: number;
  text: string;
  host_reply: string | null;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

function mapRowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    listingId: row.listing_id,
    authorId: row.author_id,
    authorName: row.profiles?.name || "Guest",
    authorAvatar: row.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${row.author_id}`,
    rating: Number(row.rating),
    subscores: {
      cleanliness: Number(row.cleanliness),
      accuracy: Number(row.accuracy),
      communication: Number(row.communication),
      location: Number(row.location),
      checkIn: Number(row.check_in),
      value: Number(row.value),
    },
    text: row.text,
    date: row.created_at.slice(0, 10),
    stayType: "rent",
    hostReply: row.host_reply ?? undefined,
  };
}

/** Every real review for a listing, newest first. Publicly readable — no auth required. */
export async function fetchReviewsForListing(listingId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(name, avatar_url)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ReviewRow[]).map(mapRowToReview);
}

/** Which of the signed-in guest's own booking ids already have a review, so "leave a review" can hide once used. */
export async function fetchMyReviewedBookingIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from("reviews").select("booking_id");
  if (error || !data) return new Set();
  return new Set((data as { booking_id: string }[]).map((r) => r.booking_id));
}

/**
 * Submits a review for a completed, paid stay. The "Guests can review
 * their own completed, paid stays" RLS policy re-validates eligibility
 * server-side (paid + check-out already passed) — this can fail if, say,
 * the guest tries before their trip is over.
 */
export async function submitReview(input: {
  bookingId: string;
  listingId: string;
  rating: number;
  subscores: ReviewSubscores;
  text: string;
}): Promise<{ review: Review | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { review: null, error: "Not signed in" };

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: input.bookingId,
      listing_id: input.listingId,
      author_id: user.id,
      rating: input.rating,
      cleanliness: input.subscores.cleanliness,
      accuracy: input.subscores.accuracy,
      communication: input.subscores.communication,
      location: input.subscores.location,
      check_in: input.subscores.checkIn,
      value: input.subscores.value,
      text: input.text,
    })
    .select("*, profiles(name, avatar_url)")
    .maybeSingle();
  if (error || !data) return { review: null, error: error?.message ?? "Couldn't submit that review — try again." };
  return { review: mapRowToReview(data as ReviewRow), error: null };
}

/** Adds or updates the listing host's reply to a review. */
export async function replyToReview(reviewId: string, hostReply: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reviews").update({ host_reply: hostReply }).eq("id", reviewId);
  return { error: error?.message ?? null };
}
