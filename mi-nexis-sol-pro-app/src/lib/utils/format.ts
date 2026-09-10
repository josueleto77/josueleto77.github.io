export function formatKwh(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} kWh`;
}

export function formatKw(value: number): string {
  return `${value.toFixed(2)} kW`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatSqFt(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} sq ft`;
}

export function squareMetersToSqFt(m2: number): number {
  return m2 * 10.7639;
}

const AZIMUTH_COMPASS_POINTS = [
  "North",
  "North-Northeast",
  "Northeast",
  "East-Northeast",
  "East",
  "East-Southeast",
  "Southeast",
  "South-Southeast",
  "South",
  "South-Southwest",
  "Southwest",
  "West-Southwest",
  "West",
  "West-Northwest",
  "Northwest",
  "North-Northwest",
];

/** Converts a Solar API azimuth (degrees clockwise from north) to a homeowner-friendly compass direction. */
export function azimuthToCompass(azimuthDegrees: number): string {
  const normalized = ((azimuthDegrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return AZIMUTH_COMPASS_POINTS[index] ?? "South";
}
