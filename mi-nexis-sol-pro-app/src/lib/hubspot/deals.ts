import "server-only";
import { hubspotFetch } from "./client";
import { env } from "@/lib/env";
import { SITE } from "@/lib/config";
import type { HubSpotDeal, HubSpotDealProperties, SolarAnalysisStatus } from "@/types/hubspot";
import type { SolarAnalysisResult } from "@/types/solar";

interface SearchResponse<T> {
  total: number;
  results: T[];
}

/**
 * Looks up a deal previously created for this exact form submission
 * (idempotency key), so a double-click or retried request updates the same
 * deal instead of creating a duplicate.
 */
async function findDealBySubmissionId(submissionId: string): Promise<HubSpotDeal | null> {
  const result = await hubspotFetch<SearchResponse<HubSpotDeal>>("/crm/v3/objects/deals/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "nexis_submission_id", operator: "EQ", value: submissionId }] }],
      properties: ["dealname", "dealstage", "nexis_submission_id"],
      limit: 1,
    }),
  });
  return result.results[0] ?? null;
}

export interface CreateHotDealInput {
  contactId: string;
  propertyAddress: string;
  phone: string;
  annualConsumptionKwh: number;
  submissionId: string;
}

/**
 * Creates (or, if this submissionId was already processed, reuses) a Deal in
 * the configured HubSpot pipeline/stage, then associates it with the
 * contact. Pipeline and stage IDs always come from environment variables —
 * never hard-coded — per Nexis Power's HubSpot configuration.
 *
 * Requires these HubSpot custom deal properties to exist (see README):
 *   property_address, phone, annual_consumption_kwh, solar_score,
 *   recommended_system_size_kw, recommended_panel_count,
 *   estimated_solar_production_kwh, estimated_energy_offset_percent,
 *   max_panel_count, max_system_size_kw, usable_solar_roof_area_sqft,
 *   solar_suitability, google_solar_imagery_date, lead_source,
 *   solar_analysis_status, nexis_submission_id
 */
export async function createHotDeal(input: CreateHotDealInput): Promise<HubSpotDeal> {
  const existing = await findDealBySubmissionId(input.submissionId);
  if (existing) return existing;

  const properties: HubSpotDealProperties = {
    dealname: `Solar - ${input.propertyAddress}`,
    pipeline: env.hubspotPipelineId,
    dealstage: env.hubspotHotDealStageId,
    property_address: input.propertyAddress,
    phone: input.phone,
    annual_consumption_kwh: String(input.annualConsumptionKwh),
    lead_source: SITE.leadSource,
    solar_analysis_status: "partial" satisfies SolarAnalysisStatus,
    nexis_submission_id: input.submissionId,
  };

  const deal = await hubspotFetch<HubSpotDeal>("/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify({ properties }),
  });

  await associateDealWithContact(deal.id, input.contactId);
  return deal;
}

async function associateDealWithContact(dealId: string, contactId: string): Promise<void> {
  await hubspotFetch(`/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

/**
 * Pushes the completed Google Solar API assessment onto the Deal. Called
 * after solar analysis finishes — if it fails or the property has no
 * coverage, this still runs with `status` set to "unavailable"/"error" so
 * the lead is never lost, just marked accordingly.
 */
export async function updateDealWithSolarResults(
  dealId: string,
  status: SolarAnalysisStatus,
  result: SolarAnalysisResult | null
): Promise<HubSpotDeal> {
  const properties: HubSpotDealProperties = {
    solar_analysis_status: status,
  };

  if (result) {
    if (result.solarScore) properties.solar_score = String(result.solarScore.score);
    if (result.systemRecommendation) {
      properties.recommended_system_size_kw = String(result.systemRecommendation.systemSizeKw);
      properties.recommended_panel_count = String(result.systemRecommendation.panelCount);
      properties.estimated_solar_production_kwh = String(result.systemRecommendation.estimatedAnnualProductionKwh);
      properties.estimated_energy_offset_percent = String(result.systemRecommendation.estimatedOffsetPercent);
    }
    if (result.maxPanelCount !== null) properties.max_panel_count = String(result.maxPanelCount);
    if (result.maxSystemSizeKw !== null) properties.max_system_size_kw = String(result.maxSystemSizeKw);
    if (result.roofAnalysis) {
      properties.usable_solar_roof_area_sqft = String(Math.round(result.roofAnalysis.usableAreaSqFt));
      properties.solar_suitability = result.roofAnalysis.suitability;
    }
    if (result.imageryDate) properties.google_solar_imagery_date = result.imageryDate;
  }

  return hubspotFetch<HubSpotDeal>(`/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}
