import type { BuildingInsightsResponse, SolarPanelConfig, SystemOption } from "@/types/solar";
import { PANEL_WATTAGE_W } from "@/lib/config";

function sortedConfigs(data: BuildingInsightsResponse): SolarPanelConfig[] {
  return [...(data.solarPotential.solarPanelConfigs ?? [])].sort((a, b) => a.panelsCount - b.panelsCount);
}

function toOption(
  config: SolarPanelConfig,
  key: SystemOption["key"],
  label: SystemOption["label"],
  annualConsumptionKwh: number,
  isNexisRecommended: boolean
): SystemOption {
  return {
    key,
    label,
    systemSizeKw: Number(((config.panelsCount * PANEL_WATTAGE_W) / 1000).toFixed(2)),
    panelCount: config.panelsCount,
    estimatedAnnualProductionKwh: Math.round(config.yearlyEnergyDcKwh),
    estimatedOffsetPercent: annualConsumptionKwh > 0 ? Math.round((config.yearlyEnergyDcKwh / annualConsumptionKwh) * 100) : 0,
    isNexisRecommended,
  };
}

function closestConfigToOffset(configs: SolarPanelConfig[], annualConsumptionKwh: number, targetOffset: number): SolarPanelConfig {
  const targetKwh = annualConsumptionKwh * targetOffset;
  return configs.reduce((closest, c) =>
    Math.abs(c.yearlyEnergyDcKwh - targetKwh) < Math.abs(closest.yearlyEnergyDcKwh - targetKwh) ? c : closest
  );
}

/**
 * Builds up to three real, roof-fitted system options (Essential / Recommended /
 * Maximum Solar) sourced directly from Google Solar API's `solarPanelConfigs`.
 * Only configurations the roof can physically support are ever surfaced —
 * nothing here is a generic formula guess.
 */
export function buildSystemOptions(
  data: BuildingInsightsResponse,
  annualConsumptionKwh: number
): SystemOption[] {
  const configs = sortedConfigs(data);
  if (configs.length === 0) return [];

  const recommendedConfig = closestConfigToOffset(configs, annualConsumptionKwh, 1.0);

  // Essential: aim for ~80% offset, but never larger than the recommended config.
  const essentialCandidates = configs.filter((c) => c.panelsCount <= recommendedConfig.panelsCount);
  const essentialConfig =
    essentialCandidates.length > 0
      ? closestConfigToOffset(essentialCandidates, annualConsumptionKwh, 0.8)
      : configs[0]!;

  // Maximum: the largest configuration the roof supports.
  const maximumConfig = configs[configs.length - 1]!;

  const options: SystemOption[] = [];
  const seenPanelCounts = new Set<number>();

  const essential = toOption(essentialConfig, "essential", "ESSENTIAL", annualConsumptionKwh, false);
  options.push(essential);
  seenPanelCounts.add(essential.panelCount);

  if (!seenPanelCounts.has(recommendedConfig.panelsCount)) {
    const recommended = toOption(recommendedConfig, "recommended", "RECOMMENDED", annualConsumptionKwh, true);
    options.push(recommended);
    seenPanelCounts.add(recommended.panelCount);
  }

  if (!seenPanelCounts.has(maximumConfig.panelsCount)) {
    const maximum = toOption(maximumConfig, "maximum", "MAXIMUM SOLAR", annualConsumptionKwh, false);
    options.push(maximum);
  }

  // If de-duping collapsed everything to one option (a very small roof), that single
  // option is still marked recommended so the UI has something to highlight.
  if (options.length === 1 && options[0]) {
    options[0].isNexisRecommended = true;
    options[0].key = "recommended";
    options[0].label = "RECOMMENDED";
  }

  return options;
}
