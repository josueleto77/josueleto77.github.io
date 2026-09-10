import "server-only";
import { hubspotFetch } from "./client";
import { SITE } from "@/lib/config";
import { normalizePhoneE164 } from "@/lib/utils/phone";
import type { HubSpotContact } from "@/types/hubspot";

interface SearchResponse<T> {
  total: number;
  results: T[];
}

/**
 * Finds an existing contact by normalized phone number to avoid duplicate
 * contacts across repeated visits / form re-submissions. Searches both the
 * standard `phone` property and (defensively) `mobilephone`.
 *
 * NOTE: requires the HubSpot account's `phone` property to be indexed for
 * search (default HubSpot behavior) — see README "HubSpot setup".
 */
export async function findContactByPhone(rawPhone: string): Promise<HubSpotContact | null> {
  const normalized = normalizePhoneE164(rawPhone);

  const result = await hubspotFetch<SearchResponse<HubSpotContact>>("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: "phone", operator: "EQ", value: normalized }] },
        { filters: [{ propertyName: "phone", operator: "EQ", value: rawPhone }] },
      ],
      properties: ["phone", "address", "annual_electric_usage_kwh", "lead_source", "firstname", "lastname"],
      limit: 1,
    }),
  });

  return result.results[0] ?? null;
}

export interface UpsertContactInput {
  phone: string;
  address: string;
  annualConsumptionKwh: number;
}

/**
 * Creates or updates a HubSpot contact for this lead, keyed on phone number.
 *
 * Requires these HubSpot custom contact properties to exist (create once in
 * HubSpot: Settings → Properties → Contact properties — see README):
 *   - annual_electric_usage_kwh (Number)
 *   - lead_source (Single-line text or dropdown)
 * `phone` and `address` are standard HubSpot contact properties.
 */
export async function upsertContact(input: UpsertContactInput): Promise<HubSpotContact> {
  const existing = await findContactByPhone(input.phone);

  const properties = {
    phone: normalizePhoneE164(input.phone),
    address: input.address,
    annual_electric_usage_kwh: String(input.annualConsumptionKwh),
    lead_source: SITE.leadSource,
  };

  if (existing) {
    return hubspotFetch<HubSpotContact>(`/crm/v3/objects/contacts/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  }

  return hubspotFetch<HubSpotContact>("/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  });
}
