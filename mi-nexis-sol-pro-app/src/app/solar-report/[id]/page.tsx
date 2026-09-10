import { notFound } from "next/navigation";
import { getSolarReportById } from "@/lib/db/leads";
import { ResultsHero } from "@/components/results/ResultsHero";
import { MetricCards } from "@/components/results/MetricCards";
import { EnergyComparison } from "@/components/results/EnergyComparison";
import { RoofAnalysisSection } from "@/components/results/RoofAnalysisSection";
import { SystemOptions } from "@/components/results/SystemOptions";
import { LeadConversionCTA } from "@/components/results/LeadConversionCTA";
import { Disclaimer } from "@/components/results/Disclaimer";
import { PropertyRoofView } from "@/components/maps/PropertyRoofView";
import { Button } from "@/components/ui/Button";
import { CTA_COPY, SITE } from "@/lib/config";
import type { BuildingInsightsResponse, NexisSolarScoreResult, RoofAnalysisResult, SystemOption, SystemRecommendation } from "@/types/solar";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SolarReportPage({ params }: PageProps) {
  const { id } = await params;

  let lead: Awaited<ReturnType<typeof getSolarReportById>> | null = null;
  let dbUnavailable = false;
  try {
    lead = await getSolarReportById(id);
  } catch (err) {
    console.error("[solar-report] failed to load report", err);
    dbUnavailable = true;
  }

  if (dbUnavailable) {
    return (
      <FallbackState
        heading="Your Report Is Being Prepared"
        message="We're finishing up your assessment. If this persists, a Nexis Power solar expert will reach out directly with your results."
      />
    );
  }

  if (!lead) {
    notFound();
  }

  const analysis = lead.analysis;

  if (!analysis || analysis.coverageStatus !== "COVERED") {
    return (
      <FallbackState
        heading="We Found Your Home"
        message="Detailed solar imagery isn't currently available for this property through our automated system. Your information has been saved, and a Nexis Power solar expert will follow up with a manual solar design."
        address={lead.property.formattedAddress}
      />
    );
  }

  const solarScore: NexisSolarScoreResult | null =
    analysis.solarScore !== null && analysis.solarScoreCategory
      ? {
          score: analysis.solarScore,
          category: analysis.solarScoreCategory as NexisSolarScoreResult["category"],
          breakdown: { sunshineScore: 0, usableAreaScore: 0, orientationScore: 0, shadingScore: 0, productionPotentialScore: 0 },
        }
      : null;

  const roofAnalysis: RoofAnalysisResult | null =
    analysis.roofSuitability && analysis.usableAreaSqFt !== null
      ? {
          suitability: analysis.roofSuitability as RoofAnalysisResult["suitability"],
          usableAreaSqFt: analysis.usableAreaSqFt,
          usableAreaMeters2: 0,
          primaryOrientation: analysis.primaryOrientation ?? "Unknown",
          primaryPitchDegrees: analysis.primaryPitchDegrees,
          solarExposure: (analysis.solarExposure as RoofAnalysisResult["solarExposure"]) ?? "Moderate",
          shading: (analysis.shading as RoofAnalysisResult["shading"]) ?? "Moderate",
          maxPanelCapacity: analysis.maxPanelCapacity ?? 0,
          maxSunshineHoursPerYear: analysis.maxSunshineHoursPerYear ?? 0,
          imageryDate: analysis.imageryDate,
          imageryQuality: analysis.imageryQuality as RoofAnalysisResult["imageryQuality"],
        }
      : null;

  const systemRecommendation: SystemRecommendation | null =
    analysis.recommendedSystemSizeKw !== null && analysis.recommendedPanelCount !== null
      ? {
          systemSizeKw: analysis.recommendedSystemSizeKw,
          panelCount: analysis.recommendedPanelCount,
          estimatedAnnualProductionKwh: analysis.estimatedAnnualProductionKwh ?? 0,
          estimatedOffsetPercent: analysis.estimatedOffsetPercent ?? 0,
          roofUsagePercent: roofAnalysis?.maxPanelCapacity ? Math.round(((analysis.recommendedPanelCount ?? 0) / roofAnalysis.maxPanelCapacity) * 100) : 0,
          offsetCapped: analysis.offsetCapped,
        }
      : null;

  const systemOptions: SystemOption[] = analysis.systemOptions.map((option) => ({
    key: option.key,
    label: option.label as SystemOption["label"],
    systemSizeKw: option.systemSizeKw,
    panelCount: option.panelCount,
    estimatedAnnualProductionKwh: option.estimatedAnnualProductionKwh,
    estimatedOffsetPercent: option.estimatedOffsetPercent,
    isNexisRecommended: option.isNexisRecommended,
  }));

  const rawSolarData = analysis.rawSolarApiResponse as BuildingInsightsResponse | null;

  return (
    <div>
      <ResultsHero address={lead.property.formattedAddress} />

      <div className="mx-auto max-w-6xl space-y-8 px-5 pb-20 sm:px-8">
        {rawSolarData && (
          <PropertyRoofView
            center={{ latitude: lead.property.latitude, longitude: lead.property.longitude }}
            solarData={rawSolarData}
            visiblePanelCount={systemRecommendation?.panelCount ?? 0}
          />
        )}

        {solarScore && systemRecommendation && <MetricCards solarScore={solarScore} systemRecommendation={systemRecommendation} />}

        <div className="grid gap-6 lg:grid-cols-2">
          {systemRecommendation && (
            <EnergyComparison
              annualConsumptionKwh={lead.annualConsumptionKwh}
              estimatedAnnualProductionKwh={systemRecommendation.estimatedAnnualProductionKwh}
              estimatedOffsetPercent={systemRecommendation.estimatedOffsetPercent}
            />
          )}
          {roofAnalysis && <RoofAnalysisSection roof={roofAnalysis} />}
        </div>

        <SystemOptions options={systemOptions} />

        <LeadConversionCTA />

        <Disclaimer />
      </div>
    </div>
  );
}

function FallbackState({ heading, message, address }: { heading: string; message: string; address?: string }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-3xl text-nexis-dark sm:text-4xl">{heading}</h1>
      {address && <p className="mt-2 text-sm font-medium uppercase tracking-wide text-nexis-blue">{address}</p>}
      <p className="mx-auto mt-4 max-w-md text-sm text-nexis-dark/60">{message}</p>
      <div className="mx-auto mt-8 max-w-xs">
        <a href={`tel:${SITE.contactPhone.replace(/\D/g, "")}`}>
          <Button fullWidth>{CTA_COPY.manualDesign}</Button>
        </a>
      </div>
      <Disclaimer />
    </div>
  );
}
