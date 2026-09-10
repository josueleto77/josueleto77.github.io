import "server-only";
import { env } from "@/lib/env";
import type { BuildingInsightsResponse, SolarLookupResult } from "@/types/solar";

const SOLAR_API_BASE = "https://solar.googleapis.com/v1";

/**
 * Calls the Google Solar API's `buildingInsights:findClosest` endpoint for a
 * given lat/lng — the primary source of roof/solar data for this app.
 * Docs: https://developers.google.com/maps/documentation/solar/building-insights
 *
 * This NEVER fabricates data: on any non-2xx or coverage gap it returns a
 * typed status the UI/CRM layers can react to honestly (e.g. "we found your
 * home, but detailed solar imagery is not currently available").
 */
export async function fetchBuildingInsights(
  latitude: number,
  longitude: number
): Promise<SolarLookupResult> {
  const url = new URL(`${SOLAR_API_BASE}/buildingInsights:findClosest`);
  url.searchParams.set("location.latitude", latitude.toFixed(6));
  url.searchParams.set("location.longitude", longitude.toFixed(6));
  url.searchParams.set("requiredQuality", "MEDIUM");
  url.searchParams.set("key", env.googleSolarApiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      // Building insights for a given roof don't change minute to minute;
      // cache briefly server-side to soften duplicate lookups (double form
      // submits, page refreshes) without going stale for real re-analyses.
      next: { revalidate: 3600 },
    });
  } catch (err) {
    return {
      status: "ERROR",
      data: null,
      errorMessage: err instanceof Error ? err.message : "Network error calling Solar API.",
    };
  }

  if (response.status === 404) {
    return { status: "NOT_FOUND", data: null, errorMessage: "No building found near this location." };
  }

  if (!response.ok) {
    const body = await safeReadJson(response);
    const message = extractGoogleErrorMessage(body) ?? `Solar API error (HTTP ${response.status}).`;

    // Google returns 404 for "no building" but also sometimes NOT_FOUND-typed
    // errors inside a 4xx body depending on the failure mode; treat both the
    // same way for the UI.
    if (response.status === 400 && /location/i.test(message)) {
      return { status: "NOT_FOUND", data: null, errorMessage: message };
    }

    return { status: "ERROR", data: null, errorMessage: message };
  }

  const data = (await response.json()) as BuildingInsightsResponse;

  if (!data?.solarPotential) {
    return {
      status: "IMAGERY_UNAVAILABLE",
      data,
      errorMessage: "Building found but no solar potential data is available for this property.",
    };
  }

  return { status: "COVERED", data };
}

/**
 * Builds a signed URL for a Solar API Data Layers GeoTIFF (e.g. the annual
 * flux / sunshine layer) for the "Solar Potential" map view. The actual
 * raster is large and requires server-side fetching with the API key, so
 * the browser never calls this directly — see
 * `/api/solar/analyze` for how a proxied, cache-friendly URL is exposed to
 * the client instead of the raw key.
 */
export async function fetchDataLayers(latitude: number, longitude: number, radiusMeters = 50) {
  const url = new URL(`${SOLAR_API_BASE}/dataLayers:get`);
  url.searchParams.set("location.latitude", latitude.toFixed(6));
  url.searchParams.set("location.longitude", longitude.toFixed(6));
  url.searchParams.set("radiusMeters", String(radiusMeters));
  url.searchParams.set("view", "FULL_LAYERS");
  url.searchParams.set("requiredQuality", "MEDIUM");
  url.searchParams.set("key", env.googleSolarApiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<{
    imageryDate: { year: number; month: number; day: number };
    dsmUrl?: string;
    rgbUrl?: string;
    maskUrl?: string;
    annualFluxUrl?: string;
    monthlyFluxUrl?: string;
  }>;
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractGoogleErrorMessage(body: unknown): string | null {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    body.error &&
    typeof body.error === "object" &&
    "message" in body.error &&
    typeof (body.error as { message?: unknown }).message === "string"
  ) {
    return (body.error as { message: string }).message;
  }
  return null;
}
