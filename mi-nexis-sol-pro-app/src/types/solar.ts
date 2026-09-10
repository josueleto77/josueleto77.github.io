/**
 * Types for Google Solar API responses (Building Insights + Data Layers).
 * Modeled on https://developers.google.com/maps/documentation/solar/reference/rest
 * Only the fields this app actually consumes are typed in full; everything
 * else on the raw response is preserved via the `[key: string]: unknown` index.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface SizeAndSunshineStats {
  areaMeters2: number;
  sunshineQuantiles: number[];
  groundAreaMeters2: number;
}

export interface RoofSegmentSummary {
  pitchDegrees: number;
  azimuthDegrees: number;
  stats: SizeAndSunshineStats;
  center: LatLng;
  boundingBox: {
    sw: LatLng;
    ne: LatLng;
  };
  planeHeightAtCenterMeters: number;
}

export interface SolarPanelConfigRoofSegmentSummary {
  pitchDegrees: number;
  azimuthDegrees: number;
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: SolarPanelConfigRoofSegmentSummary[];
}

export interface SolarPanel {
  center: LatLng;
  orientation: "LANDSCAPE" | "PORTRAIT";
  segmentIndex: number;
  yearlyEnergyDcKwh: number;
}

export interface RoofSegmentStat extends RoofSegmentSummary {}

export interface BuildingInsightsSolarPotential {
  maxArrayPanelsCount: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  carbonOffsetFactorKgPerMwh: number;
  wholeRoofStats: SizeAndSunshineStats;
  roofSegmentStats: RoofSegmentStat[];
  solarPanelConfigs: SolarPanelConfig[];
  solarPanels: SolarPanel[];
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  panelLifetimeYears: number;
  buildingStats: SizeAndSunshineStats;
}

export interface BuildingInsightsResponse {
  name: string;
  center: LatLng;
  boundingBox: { sw: LatLng; ne: LatLng };
  imageryDate: { year: number; month: number; day: number };
  imageryProcessedDate?: { year: number; month: number; day: number };
  postalCode?: string;
  administrativeArea?: string;
  statisticalArea?: string;
  regionCode?: string;
  solarPotential: BuildingInsightsSolarPotential;
  imageryQuality: "HIGH" | "MEDIUM" | "LOW" | "IMAGERY_QUALITY_UNSPECIFIED";
  [key: string]: unknown;
}

export type SolarCoverageStatus =
  | "COVERED"
  | "NOT_FOUND"
  | "NO_BUILDING"
  | "IMAGERY_UNAVAILABLE"
  | "ERROR";

export interface SolarLookupResult {
  status: SolarCoverageStatus;
  data: BuildingInsightsResponse | null;
  errorMessage?: string;
}

export type SolarSuitability =
  | "Excellent"
  | "Very Good"
  | "Good"
  | "Fair"
  | "Limited";

export interface RoofAnalysisResult {
  suitability: SolarSuitability;
  usableAreaSqFt: number;
  usableAreaMeters2: number;
  primaryOrientation: string;
  primaryPitchDegrees: number | null;
  solarExposure: "Excellent" | "Good" | "Moderate" | "Low";
  shading: "Low" | "Moderate" | "High";
  maxPanelCapacity: number;
  maxSunshineHoursPerYear: number;
  imageryDate: string | null;
  imageryQuality: BuildingInsightsResponse["imageryQuality"] | null;
}

export interface NexisSolarScoreResult {
  score: number;
  category:
    | "EXCELLENT SOLAR ROOF"
    | "VERY GOOD"
    | "GOOD"
    | "FAIR"
    | "LIMITED SOLAR POTENTIAL";
  breakdown: {
    sunshineScore: number;
    usableAreaScore: number;
    orientationScore: number;
    shadingScore: number;
    productionPotentialScore: number;
  };
}

export interface SystemRecommendation {
  systemSizeKw: number;
  panelCount: number;
  estimatedAnnualProductionKwh: number;
  estimatedOffsetPercent: number;
  roofUsagePercent: number;
  offsetCapped: boolean;
}

export interface SystemOption {
  key: "essential" | "recommended" | "maximum";
  label: "ESSENTIAL" | "RECOMMENDED" | "MAXIMUM SOLAR";
  systemSizeKw: number;
  panelCount: number;
  estimatedAnnualProductionKwh: number;
  estimatedOffsetPercent: number;
  isNexisRecommended: boolean;
}

export interface SolarAnalysisResult {
  property: {
    formattedAddress: string;
    latitude: number;
    longitude: number;
    placeId: string | null;
  };
  coverage: SolarCoverageStatus;
  solarScore: NexisSolarScoreResult | null;
  roofAnalysis: RoofAnalysisResult | null;
  systemRecommendation: SystemRecommendation | null;
  systemOptions: SystemOption[];
  panelConfig: {
    wattage: number;
  };
  annualConsumptionKwh: number;
  imageryDate: string | null;
  maxPanelCount: number | null;
  maxSystemSizeKw: number | null;
}
