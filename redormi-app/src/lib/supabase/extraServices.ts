import { supabase } from "@/lib/supabase/client";
import type { CancellationPolicy, ExtraService, ExtraServiceOrder } from "@/lib/types";

interface ExtraServiceRow {
  id: string;
  listing_id: string;
  host_id: string;
  category: ExtraService["category"];
  name: string;
  description: string;
  photos: string[];
  pricing_unit: ExtraService["pricingUnit"];
  price: number;
  quantity_available: number;
  deposit: number | null;
  requires_license: boolean;
  age_minimum: number | null;
  cancellation_policy: CancellationPolicy;
  commission_pct: number;
  created_at: string;
}

interface ExtraServiceOrderRow {
  id: string;
  service_id: string;
  booking_id: string | null;
  swap_id: string | null;
  guest_id: string;
  quantity: number;
  total_price: number;
  status: ExtraServiceOrder["status"];
  waiver_accepted: boolean;
  license_uploaded: boolean;
  created_at: string;
}

function mapService(row: ExtraServiceRow): ExtraService {
  return {
    id: row.id,
    listingId: row.listing_id,
    category: row.category,
    name: row.name,
    description: row.description,
    photos: row.photos ?? [],
    pricingUnit: row.pricing_unit,
    price: row.price,
    quantityAvailable: row.quantity_available,
    deposit: row.deposit ?? undefined,
    requiresLicense: row.requires_license,
    ageMinimum: row.age_minimum ?? undefined,
    cancellationPolicy: row.cancellation_policy,
    commissionPct: row.commission_pct,
  };
}

function mapOrder(row: ExtraServiceOrderRow): ExtraServiceOrder {
  return {
    id: row.id,
    serviceId: row.service_id,
    bookingId: row.booking_id ?? undefined,
    swapId: row.swap_id ?? undefined,
    guestId: row.guest_id,
    quantity: row.quantity,
    totalPrice: row.total_price,
    status: row.status,
    waiverAccepted: row.waiver_accepted,
    licenseUploaded: row.license_uploaded,
    createdAt: row.created_at,
  };
}

/** A host's own extra services (across all their listings). */
export async function fetchExtraServicesForHost(hostId: string): Promise<ExtraService[]> {
  const { data, error } = await supabase.from("extra_services").select("*").eq("host_id", hostId);
  if (error || !data) return [];
  return (data as ExtraServiceRow[]).map(mapService);
}

/** Every order visible to the signed-in user (guest, or host of the service) — RLS-scoped. */
export async function fetchServiceOrdersForUser(): Promise<ExtraServiceOrder[]> {
  const { data, error } = await supabase.from("extra_service_orders").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ExtraServiceOrderRow[]).map(mapOrder);
}

export async function createExtraServiceInSupabase(
  service: Omit<ExtraService, "id">,
  hostId: string
): Promise<ExtraService | null> {
  const { data, error } = await supabase
    .from("extra_services")
    .insert({
      listing_id: service.listingId,
      host_id: hostId,
      category: service.category,
      name: service.name,
      description: service.description,
      photos: service.photos,
      pricing_unit: service.pricingUnit,
      price: service.price,
      quantity_available: service.quantityAvailable,
      deposit: service.deposit,
      requires_license: service.requiresLicense ?? false,
      age_minimum: service.ageMinimum,
      cancellation_policy: service.cancellationPolicy,
      commission_pct: service.commissionPct,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapService(data as ExtraServiceRow);
}

export async function updateExtraServiceInSupabase(
  serviceId: string,
  patch: Partial<ExtraService>
): Promise<ExtraService | null> {
  const dbPatch: Partial<ExtraServiceRow> = {};
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.photos !== undefined) dbPatch.photos = patch.photos;
  if (patch.pricingUnit !== undefined) dbPatch.pricing_unit = patch.pricingUnit;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.quantityAvailable !== undefined) dbPatch.quantity_available = patch.quantityAvailable;
  if (patch.deposit !== undefined) dbPatch.deposit = patch.deposit;
  if (patch.requiresLicense !== undefined) dbPatch.requires_license = patch.requiresLicense;
  if (patch.ageMinimum !== undefined) dbPatch.age_minimum = patch.ageMinimum;
  if (patch.cancellationPolicy !== undefined) dbPatch.cancellation_policy = patch.cancellationPolicy;
  if (patch.commissionPct !== undefined) dbPatch.commission_pct = patch.commissionPct;

  const { data, error } = await supabase
    .from("extra_services")
    .update(dbPatch)
    .eq("id", serviceId)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapService(data as ExtraServiceRow);
}

export async function deleteExtraServiceInSupabase(serviceId: string): Promise<boolean> {
  const { error } = await supabase.from("extra_services").delete().eq("id", serviceId);
  return !error;
}

export async function orderServiceInSupabase(
  order: Omit<ExtraServiceOrder, "id" | "createdAt" | "status">
): Promise<ExtraServiceOrder | null> {
  const { data, error } = await supabase
    .from("extra_service_orders")
    .insert({
      service_id: order.serviceId,
      booking_id: order.bookingId,
      swap_id: order.swapId,
      guest_id: order.guestId,
      quantity: order.quantity,
      total_price: order.totalPrice,
      waiver_accepted: order.waiverAccepted ?? false,
      license_uploaded: order.licenseUploaded ?? false,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as ExtraServiceOrderRow);
}
