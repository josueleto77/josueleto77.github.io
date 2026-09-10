import "server-only";
import { prisma } from "./prisma";
import type { AnalyzeHomeInput } from "@/lib/validation/schemas";
import type { SolarAnalysisResult, SolarAnalysisStatus } from "@/types";

/**
 * Finds or creates the SolarLead for this submissionId (idempotency key) and
 * its associated Property. Safe to call multiple times with the same
 * submissionId — a retried request reuses the same rows rather than
 * duplicating the lead.
 */
export async function upsertLeadForSubmission(input: AnalyzeHomeInput) {
  const existing = await prisma.solarLead.findUnique({
    where: { submissionId: input.submissionId },
    include: { property: true },
  });
  if (existing) return existing;

  const property = await prisma.property.create({
    data: {
      formattedAddress: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      placeId: input.placeId,
    },
  });

  return prisma.solarLead.create({
    data: {
      submissionId: input.submissionId,
      phone: input.phone,
      annualConsumptionKwh: input.annualConsumptionKwh,
      consentAcceptedAt: new Date(),
      propertyId: property.id,
    },
    include: { property: true },
  });
}

export async function saveSolarAnalysis(leadId: string, result: SolarAnalysisResult, rawResponse: unknown) {
  return prisma.solarAnalysis.upsert({
    where: { leadId },
    create: {
      leadId,
      coverageStatus: result.coverage,
      solarScore: result.solarScore?.score ?? null,
      solarScoreCategory: result.solarScore?.category ?? null,
      roofSuitability: result.roofAnalysis?.suitability ?? null,
      usableAreaSqFt: result.roofAnalysis?.usableAreaSqFt ?? null,
      primaryOrientation: result.roofAnalysis?.primaryOrientation ?? null,
      primaryPitchDegrees: result.roofAnalysis?.primaryPitchDegrees ?? null,
      solarExposure: result.roofAnalysis?.solarExposure ?? null,
      shading: result.roofAnalysis?.shading ?? null,
      maxPanelCapacity: result.roofAnalysis?.maxPanelCapacity ?? null,
      maxSunshineHoursPerYear: result.roofAnalysis?.maxSunshineHoursPerYear ?? null,
      imageryDate: result.imageryDate,
      imageryQuality: result.roofAnalysis?.imageryQuality ?? null,
      recommendedSystemSizeKw: result.systemRecommendation?.systemSizeKw ?? null,
      recommendedPanelCount: result.systemRecommendation?.panelCount ?? null,
      estimatedAnnualProductionKwh: result.systemRecommendation?.estimatedAnnualProductionKwh ?? null,
      estimatedOffsetPercent: result.systemRecommendation?.estimatedOffsetPercent ?? null,
      offsetCapped: result.systemRecommendation?.offsetCapped ?? false,
      rawSolarApiResponse: rawResponse as never,
      systemOptions: {
        create: result.systemOptions.map((option) => ({
          key: option.key,
          label: option.label,
          systemSizeKw: option.systemSizeKw,
          panelCount: option.panelCount,
          estimatedAnnualProductionKwh: option.estimatedAnnualProductionKwh,
          estimatedOffsetPercent: option.estimatedOffsetPercent,
          isNexisRecommended: option.isNexisRecommended,
        })),
      },
    },
    // Re-analysis of the same lead (rare, but possible via retry) replaces prior results.
    update: {
      coverageStatus: result.coverage,
      solarScore: result.solarScore?.score ?? null,
      solarScoreCategory: result.solarScore?.category ?? null,
      roofSuitability: result.roofAnalysis?.suitability ?? null,
      usableAreaSqFt: result.roofAnalysis?.usableAreaSqFt ?? null,
      primaryOrientation: result.roofAnalysis?.primaryOrientation ?? null,
      primaryPitchDegrees: result.roofAnalysis?.primaryPitchDegrees ?? null,
      solarExposure: result.roofAnalysis?.solarExposure ?? null,
      shading: result.roofAnalysis?.shading ?? null,
      maxPanelCapacity: result.roofAnalysis?.maxPanelCapacity ?? null,
      maxSunshineHoursPerYear: result.roofAnalysis?.maxSunshineHoursPerYear ?? null,
      imageryDate: result.imageryDate,
      imageryQuality: result.roofAnalysis?.imageryQuality ?? null,
      recommendedSystemSizeKw: result.systemRecommendation?.systemSizeKw ?? null,
      recommendedPanelCount: result.systemRecommendation?.panelCount ?? null,
      estimatedAnnualProductionKwh: result.systemRecommendation?.estimatedAnnualProductionKwh ?? null,
      estimatedOffsetPercent: result.systemRecommendation?.estimatedOffsetPercent ?? null,
      offsetCapped: result.systemRecommendation?.offsetCapped ?? false,
      rawSolarApiResponse: rawResponse as never,
    },
  });
}

export async function saveHubSpotSync(
  leadId: string,
  status: SolarAnalysisStatus,
  ids: { contactId?: string | null; dealId?: string | null },
  errorMessage?: string | null
) {
  return prisma.hubSpotSync.upsert({
    where: { leadId },
    create: { leadId, status, contactId: ids.contactId ?? null, dealId: ids.dealId ?? null, lastError: errorMessage ?? null },
    update: { status, contactId: ids.contactId ?? undefined, dealId: ids.dealId ?? undefined, lastError: errorMessage ?? null },
  });
}

export async function getSolarReportById(id: string) {
  return prisma.solarLead.findUnique({
    where: { id },
    include: {
      property: true,
      analysis: { include: { systemOptions: true } },
    },
  });
}
