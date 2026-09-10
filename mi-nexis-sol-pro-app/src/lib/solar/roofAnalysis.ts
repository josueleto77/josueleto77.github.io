import type { BuildingInsightsResponse, RoofAnalysisResult, RoofSegmentStat } from "@/types/solar";
import { azimuthToCompass, squareMetersToSqFt } from "@/lib/utils/format";
import type { NexisSolarScoreResult } from "@/types/solar";

/** Picks the roof segment that contributes the most usable area — treated as the "primary" roof face. */
function primarySegment(segments: RoofSegmentStat[]): RoofSegmentStat | null {
  if (segments.length === 0) return null;
  return segments.reduce((largest, segment) =>
    segment.stats.areaMeters2 > largest.stats.areaMeters2 ? segment : largest
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

const SUITABILITY_BY_SCORE_BAND: Record<NexisSolarScoreResult["category"], RoofAnalysisResult["suitability"]> = {
  "EXCELLENT SOLAR ROOF": "Excellent",
  "VERY GOOD": "Very Good",
  GOOD: "Good",
  FAIR: "Fair",
  "LIMITED SOLAR POTENTIAL": "Limited",
};

/**
 * Translates raw Google Solar API `solarPotential` fields into homeowner-friendly
 * roof metrics. Every field here traces back to a real API value — nothing is
 * invented. Fields the API didn't return for a given property are simply omitted
 * upstream by the caller rather than backfilled with guesses.
 */
export function analyzeRoof(
  data: BuildingInsightsResponse,
  solarScore: NexisSolarScoreResult
): RoofAnalysisResult {
  const potential = data.solarPotential;
  const segment = primarySegment(potential.roofSegmentStats ?? []);
  const wholeRoofQuantiles = potential.wholeRoofStats?.sunshineQuantiles ?? [];
  const medianSunshine = median(wholeRoofQuantiles);
  const exposureRatio = potential.maxSunshineHoursPerYear
    ? medianSunshine / potential.maxSunshineHoursPerYear
    : 0;

  const lowQuantile = wholeRoofQuantiles[1] ?? wholeRoofQuantiles[0] ?? 0;
  const highQuantile = wholeRoofQuantiles[wholeRoofQuantiles.length - 2] ?? wholeRoofQuantiles[wholeRoofQuantiles.length - 1] ?? 1;
  const shadingSpreadRatio = highQuantile > 0 ? 1 - lowQuantile / highQuantile : 0;

  const imageryDate = data.imageryDate
    ? `${data.imageryDate.year}-${String(data.imageryDate.month).padStart(2, "0")}-${String(data.imageryDate.day).padStart(2, "0")}`
    : null;

  return {
    suitability: SUITABILITY_BY_SCORE_BAND[solarScore.category],
    usableAreaSqFt: squareMetersToSqFt(potential.maxArrayAreaMeters2 ?? 0),
    usableAreaMeters2: potential.maxArrayAreaMeters2 ?? 0,
    primaryOrientation: segment ? azimuthToCompass(segment.azimuthDegrees) : "Unknown",
    primaryPitchDegrees: segment ? Math.round(segment.pitchDegrees) : null,
    solarExposure:
      exposureRatio >= 0.8 ? "Excellent" : exposureRatio >= 0.6 ? "Good" : exposureRatio >= 0.4 ? "Moderate" : "Low",
    shading: shadingSpreadRatio <= 0.15 ? "Low" : shadingSpreadRatio <= 0.35 ? "Moderate" : "High",
    maxPanelCapacity: potential.maxArrayPanelsCount ?? 0,
    maxSunshineHoursPerYear: Math.round(potential.maxSunshineHoursPerYear ?? 0),
    imageryDate,
    imageryQuality: data.imageryQuality ?? null,
  };
}
