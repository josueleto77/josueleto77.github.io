import { NextRequest, NextResponse } from "next/server";
import { analyzeHomeSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rateLimit";
import { fetchBuildingInsights } from "@/lib/google/solarApi";
import { calculateNexisSolarScore } from "@/lib/solar/score";
import { analyzeRoof } from "@/lib/solar/roofAnalysis";
import { recommendSystem } from "@/lib/solar/sizing";
import { buildSystemOptions } from "@/lib/solar/panelConfigurations";
import { upsertContact } from "@/lib/hubspot/contacts";
import { createHotDeal, updateDealWithSolarResults } from "@/lib/hubspot/deals";
import { upsertLeadForSubmission, saveSolarAnalysis, saveHubSpotSync } from "@/lib/db/leads";
import { PANEL_WATTAGE_W } from "@/lib/config";
import { env } from "@/lib/env";
import type { AnalyzeHomeResponse } from "@/types";
import type { SolarAnalysisResult, SolarCoverageStatus } from "@/types/solar";
import type { SolarAnalysisStatus } from "@/types/hubspot";

export const runtime = "nodejs";

function clientKeyFor(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

function coverageToAnalysisStatus(coverage: SolarCoverageStatus): SolarAnalysisStatus {
  switch (coverage) {
    case "COVERED":
      return "completed";
    case "IMAGERY_UNAVAILABLE":
      return "partial";
    case "NOT_FOUND":
    case "NO_BUILDING":
      return "unavailable";
    case "ERROR":
    default:
      return "error";
  }
}

export async function POST(request: NextRequest) {
  // ── 1. Basic bot / abuse protection ──────────────────────────────────────
  const clientKey = clientKeyFor(request);
  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    return NextResponse.json<AnalyzeHomeResponse>(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again in a minute." } },
      { status: 429 }
    );
  }

  // ── 2. Validate input ────────────────────────────────────────────────────
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json<AnalyzeHomeResponse>(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Malformed request body." } },
      { status: 400 }
    );
  }

  const parsed = analyzeHomeSchema.safeParse(parsedBody);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid submission.";
    return NextResponse.json<AnalyzeHomeResponse>(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // ── 3. Persist the lead immediately (idempotent on submissionId) ────────
  // The homeowner's contact info is captured here, before either external
  // API is called, so a Solar API outage or HubSpot outage never loses the lead.
  let leadRecord: Awaited<ReturnType<typeof upsertLeadForSubmission>> | null = null;
  if (env.isConfigured.database) {
    try {
      leadRecord = await upsertLeadForSubmission(input);
    } catch (err) {
      console.error("[solar/analyze] failed to persist lead", err);
    }
  }

  // ── 4. Create/update HubSpot contact + Hot Deal ──────────────────────────
  // Wrapped defensively: a HubSpot outage must never prevent the homeowner
  // from getting their solar report, and the lead is already durable in the
  // database from step 3.
  let hubspotContactId: string | null = null;
  let hubspotDealId: string | null = null;
  let hubspotError: string | null = null;

  if (env.isConfigured.hubspot) {
    try {
      const contact = await upsertContact({
        phone: input.phone,
        address: input.address,
        annualConsumptionKwh: input.annualConsumptionKwh,
      });
      hubspotContactId = contact.id;

      const deal = await createHotDeal({
        contactId: contact.id,
        propertyAddress: input.address,
        phone: input.phone,
        annualConsumptionKwh: input.annualConsumptionKwh,
        submissionId: input.submissionId,
      });
      hubspotDealId = deal.id;
    } catch (err) {
      hubspotError = err instanceof Error ? err.message : "Unknown HubSpot error";
      console.error("[solar/analyze] HubSpot sync failed", err);
    }
  } else {
    hubspotError = "HubSpot is not configured on this server.";
  }

  // ── 5. Query Google Solar API ────────────────────────────────────────────
  const lookup = await fetchBuildingInsights(input.latitude, input.longitude);

  // ── 6. Run the solar analysis engine (score, roof analysis, sizing) ─────
  let solarResult: SolarAnalysisResult;

  if (lookup.status === "COVERED" && lookup.data) {
    const solarScore = calculateNexisSolarScore(lookup.data);
    const roofAnalysis = analyzeRoof(lookup.data, solarScore);
    const systemRecommendation = recommendSystem(lookup.data, input.annualConsumptionKwh);
    const systemOptions = buildSystemOptions(lookup.data, input.annualConsumptionKwh);
    const maxPanels = lookup.data.solarPotential.maxArrayPanelsCount ?? null;

    solarResult = {
      property: { formattedAddress: input.address, latitude: input.latitude, longitude: input.longitude, placeId: input.placeId },
      coverage: lookup.status,
      solarScore,
      roofAnalysis,
      systemRecommendation,
      systemOptions,
      panelConfig: { wattage: PANEL_WATTAGE_W },
      annualConsumptionKwh: input.annualConsumptionKwh,
      imageryDate: roofAnalysis.imageryDate,
      maxPanelCount: maxPanels,
      maxSystemSizeKw: maxPanels !== null ? Number(((maxPanels * PANEL_WATTAGE_W) / 1000).toFixed(2)) : null,
    };
  } else {
    solarResult = {
      property: { formattedAddress: input.address, latitude: input.latitude, longitude: input.longitude, placeId: input.placeId },
      coverage: lookup.status,
      solarScore: null,
      roofAnalysis: null,
      systemRecommendation: null,
      systemOptions: [],
      panelConfig: { wattage: PANEL_WATTAGE_W },
      annualConsumptionKwh: input.annualConsumptionKwh,
      imageryDate: null,
      maxPanelCount: null,
      maxSystemSizeKw: null,
    };
  }

  const analysisStatus = coverageToAnalysisStatus(lookup.status);

  // ── 7. Persist the analysis result ───────────────────────────────────────
  if (leadRecord && env.isConfigured.database) {
    try {
      await saveSolarAnalysis(leadRecord.id, solarResult, lookup.data ?? null);
    } catch (err) {
      console.error("[solar/analyze] failed to persist analysis", err);
    }
  }

  // ── 8. Push the completed assessment back onto the HubSpot deal ─────────
  if (hubspotDealId) {
    try {
      await updateDealWithSolarResults(hubspotDealId, analysisStatus, solarResult);
    } catch (err) {
      hubspotError = err instanceof Error ? err.message : hubspotError;
      console.error("[solar/analyze] failed to update HubSpot deal with solar results", err);
    }
  }

  if (leadRecord && env.isConfigured.database) {
    try {
      await saveHubSpotSync(
        leadRecord.id,
        analysisStatus,
        { contactId: hubspotContactId, dealId: hubspotDealId },
        hubspotError
      );
    } catch (err) {
      console.error("[solar/analyze] failed to persist HubSpot sync status", err);
    }
  }

  // ── 9. Respond ────────────────────────────────────────────────────────────
  if (lookup.status !== "COVERED") {
    const code = lookup.status === "ERROR" ? "SOLAR_UNAVAILABLE" : "NO_COVERAGE";
    const message =
      lookup.status === "ERROR"
        ? "We had trouble analyzing this property's solar potential. Your information has been saved and a Nexis Power solar expert will follow up."
        : "We found your home, but detailed solar imagery is not currently available for this property. Your information has been saved and a Nexis Power solar expert will follow up with a manual solar design.";

    return NextResponse.json<AnalyzeHomeResponse>(
      {
        success: false,
        reportId: leadRecord?.id,
        property: { formattedAddress: input.address, latitude: input.latitude, longitude: input.longitude },
        error: { code, message },
      },
      { status: 200 }
    );
  }

  return NextResponse.json<AnalyzeHomeResponse>({
    success: true,
    reportId: leadRecord?.id,
    property: { formattedAddress: input.address, latitude: input.latitude, longitude: input.longitude },
    solarPotential: solarResult,
  });
}
