import type { BuildingInsightsResponse, SolarPanelConfig, SystemRecommendation } from "@/types/solar";
import { PANEL_WATTAGE_W, TARGET_OFFSET_RANGE } from "@/lib/config";

function sortedConfigs(data: BuildingInsightsResponse): SolarPanelConfig[] {
  return [...(data.solarPotential.solarPanelConfigs ?? [])].sort((a, b) => a.panelsCount - b.panelsCount);
}

function toRecommendation(
  config: SolarPanelConfig,
  annualConsumptionKwh: number,
  maxArrayPanelsCount: number,
  offsetCapped: boolean
): SystemRecommendation {
  const offsetPercent = annualConsumptionKwh > 0 ? (config.yearlyEnergyDcKwh / annualConsumptionKwh) * 100 : 0;
  return {
    systemSizeKw: Number(((config.panelsCount * PANEL_WATTAGE_W) / 1000).toFixed(2)),
    panelCount: config.panelsCount,
    estimatedAnnualProductionKwh: Math.round(config.yearlyEnergyDcKwh),
    estimatedOffsetPercent: Math.round(offsetPercent),
    roofUsagePercent: maxArrayPanelsCount > 0 ? Math.round((config.panelsCount / maxArrayPanelsCount) * 100) : 0,
    offsetCapped,
  };
}

/**
 * Recommends a solar system sized to offset roughly 90–110% of the
 * homeowner's stated annual electricity consumption, using Google Solar
 * API's own `solarPanelConfigs` (each a real, roof-fitted panel layout with
 * its own production estimate) rather than a generic per-panel formula.
 *
 * If the roof cannot physically support enough panels to reach 90% offset,
 * the largest available configuration is returned with `offsetCapped: true`
 * so the UI can honestly say "this system could offset approximately XX% of
 * your usage" instead of overselling.
 */
export function recommendSystem(
  data: BuildingInsightsResponse,
  annualConsumptionKwh: number
): SystemRecommendation | null {
  const configs = sortedConfigs(data);
  if (configs.length === 0) return null;

  const maxArrayPanelsCount = data.solarPotential.maxArrayPanelsCount ?? configs[configs.length - 1]!.panelsCount;
  const targetMinKwh = annualConsumptionKwh * TARGET_OFFSET_RANGE.min;
  const targetMaxKwh = annualConsumptionKwh * TARGET_OFFSET_RANGE.max;

  const inRange = configs.filter((c) => c.yearlyEnergyDcKwh >= targetMinKwh && c.yearlyEnergyDcKwh <= targetMaxKwh);

  if (inRange.length > 0) {
    // Prefer the smallest config that still lands in range (don't oversize the homeowner's system).
    const best = inRange.reduce((smallest, c) => (c.panelsCount < smallest.panelsCount ? c : smallest));
    return toRecommendation(best, annualConsumptionKwh, maxArrayPanelsCount, false);
  }

  // Nothing lands in the 90-110% band — find the smallest config that meets or exceeds 90%...
  const meetsMinimum = configs.filter((c) => c.yearlyEnergyDcKwh >= targetMinKwh);
  if (meetsMinimum.length > 0) {
    const best = meetsMinimum.reduce((smallest, c) => (c.panelsCount < smallest.panelsCount ? c : smallest));
    return toRecommendation(best, annualConsumptionKwh, maxArrayPanelsCount, false);
  }

  // ...or, if the roof simply can't get there, use the largest configuration the roof supports and be
  // transparent that the offset is capped by available roof space.
  const largest = configs[configs.length - 1]!;
  return toRecommendation(largest, annualConsumptionKwh, maxArrayPanelsCount, true);
}
