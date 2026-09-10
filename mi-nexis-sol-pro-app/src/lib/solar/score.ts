import type { BuildingInsightsResponse, NexisSolarScoreResult, RoofSegmentStat } from "@/types/solar";
import { NEXIS_SOLAR_SCORE_BANDS, PANEL_WATTAGE_W } from "@/lib/config";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function primarySegment(segments: RoofSegmentStat[]): RoofSegmentStat | null {
  if (segments.length === 0) return null;
  return segments.reduce((largest, segment) =>
    segment.stats.areaMeters2 > largest.stats.areaMeters2 ? segment : largest
  );
}

/**
 * NEXIS SOLAR SCORE — a 0-100 homeowner-friendly preliminary estimate of how
 * good a candidate this roof is for solar, built entirely from Google Solar
 * API `solarPotential` fields.
 *
 * Weighting (sums to 100):
 *  - 25 pts  Annual sunshine       (maxSunshineHoursPerYear vs. a strong-market benchmark)
 *  - 20 pts  Usable roof area      (maxArrayPanelsCount vs. a typical home's panel need)
 *  - 20 pts  Roof orientation      (primary segment azimuth vs. true south, best for the northern hemisphere)
 *  - 20 pts  Shading consistency   (spread between the roof's low/high sunshine quantiles)
 *  - 15 pts  Production efficiency (best available config's yearly kWh per installed kW, vs. a strong benchmark)
 *
 * This is intentionally simple and fully transparent — it is NOT an
 * engineering certification, just a triage signal shown to the homeowner
 * with that caveat attached in the UI.
 */
export function calculateNexisSolarScore(data: BuildingInsightsResponse): NexisSolarScoreResult {
  const potential = data.solarPotential;

  // 1) Sunshine: ~2,200 sunshine-hours/year is roughly a very strong US solar market (e.g. SW deserts);
  // scored linearly against that ceiling.
  const SUNSHINE_BENCHMARK_HOURS = 2200;
  const sunshineScore = clamp((potential.maxSunshineHoursPerYear / SUNSHINE_BENCHMARK_HOURS) * 100);

  // 2) Usable area: a typical residential system is ~20 panels; roofs that can fit that or more score 100.
  const TYPICAL_PANEL_COUNT_BENCHMARK = 20;
  const usableAreaScore = clamp((potential.maxArrayPanelsCount / TYPICAL_PANEL_COUNT_BENCHMARK) * 100);

  // 3) Orientation: true south (180°) is ideal in the northern hemisphere; score decays with angular
  // distance from south, reaching 0 at due north.
  const segment = primarySegment(potential.roofSegmentStats ?? []);
  const angularDistanceFromSouth = segment ? Math.abs(180 - ((segment.azimuthDegrees % 360) + 360) % 360) : 90;
  const orientationScore = clamp(100 - (angularDistanceFromSouth / 180) * 100);

  // 4) Shading: compare the roof's lowest vs. highest annual-sunshine deciles — a big spread means
  // parts of the roof are meaningfully shaded relative to others.
  const quantiles = potential.wholeRoofStats?.sunshineQuantiles ?? [];
  const low = quantiles[1] ?? quantiles[0] ?? 0;
  const high = quantiles[quantiles.length - 2] ?? quantiles[quantiles.length - 1] ?? 1;
  const shadingSpreadRatio = high > 0 ? 1 - low / high : 0;
  const shadingScore = clamp(100 - shadingSpreadRatio * 200);

  // 5) Production efficiency: kWh/kW/year the best available panel configuration achieves, benchmarked
  // against ~1,500 kWh/kW — a solid specific-yield figure for a well-sited US residential array.
  const bestConfig = [...(potential.solarPanelConfigs ?? [])].sort((a, b) => b.yearlyEnergyDcKwh - a.yearlyEnergyDcKwh)[0];
  const PRODUCTION_BENCHMARK_KWH_PER_KW = 1500;
  let productionPotentialScore = 50;
  if (bestConfig && bestConfig.panelsCount > 0) {
    const systemKw = (bestConfig.panelsCount * PANEL_WATTAGE_W) / 1000;
    const specificYield = systemKw > 0 ? bestConfig.yearlyEnergyDcKwh / systemKw : 0;
    productionPotentialScore = clamp((specificYield / PRODUCTION_BENCHMARK_KWH_PER_KW) * 100);
  }

  const weighted =
    sunshineScore * 0.25 +
    usableAreaScore * 0.2 +
    orientationScore * 0.2 +
    shadingScore * 0.2 +
    productionPotentialScore * 0.15;

  const score = Math.round(clamp(weighted));
  const band = NEXIS_SOLAR_SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? NEXIS_SOLAR_SCORE_BANDS[NEXIS_SOLAR_SCORE_BANDS.length - 1]!;

  return {
    score,
    category: band.category,
    breakdown: {
      sunshineScore: Math.round(sunshineScore),
      usableAreaScore: Math.round(usableAreaScore),
      orientationScore: Math.round(orientationScore),
      shadingScore: Math.round(shadingScore),
      productionPotentialScore: Math.round(productionPotentialScore),
    },
  };
}
