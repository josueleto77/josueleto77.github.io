"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import type { BuildingInsightsResponse, LatLng } from "@/types/solar";

interface PropertyRoofViewProps {
  center: LatLng;
  solarData: BuildingInsightsResponse | null;
  visiblePanelCount: number;
}

type ViewMode = "satellite" | "solar";

/**
 * Renders the homeowner's roof as a real satellite map with the recommended
 * solar array drawn on top, positioned from Google Solar API's own
 * `solarPanels` placement data (each panel's real lat/lng, orientation, and
 * per-panel yearly production) — not a generic rectangle over the roof.
 *
 * `solarPanels` is returned by the API already ordered from
 * highest-to-lowest yearly production, which is exactly how Google builds
 * each `solarPanelConfigs[n]` entry — so showing the first `visiblePanelCount`
 * panels reproduces the real recommended layout.
 *
 * "Solar Potential" mode recolors each panel by its own relative annual
 * production (a real per-panel Solar API value) as a simplified stand-in for
 * rendering the full irradiance raster (`dataLayers:get`'s annualFluxUrl) —
 * see src/lib/google/solarApi.ts `fetchDataLayers` for the hook to extend
 * this with the true GeoTIFF flux layer.
 */
export function PropertyRoofView({ center, solarData, visiblePanelCount }: PropertyRoofViewProps) {
  const { loaded } = useGoogleMapsScript();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.Polygon[]>([]);
  const [mode, setMode] = useState<ViewMode>("satellite");

  useEffect(() => {
    if (!loaded || !containerRef.current || mapRef.current) return;

    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: { lat: center.latitude, lng: center.longitude },
      zoom: 20,
      mapTypeId: "satellite",
      tilt: 0,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
    });
  }, [loaded, center]);

  useEffect(() => {
    if (!loaded || !mapRef.current || !solarData) return;
    const map = mapRef.current;
    const geometry = window.google.maps.geometry;
    if (!geometry) return;

    overlaysRef.current.forEach((polygon) => polygon.setMap(null));
    overlaysRef.current = [];

    const { solarPotential } = solarData;
    const panels = [...(solarPotential.solarPanels ?? [])].slice(0, visiblePanelCount);
    if (panels.length === 0) return;

    const maxEnergy = Math.max(...panels.map((p) => p.yearlyEnergyDcKwh), 1);
    const minEnergy = Math.min(...panels.map((p) => p.yearlyEnergyDcKwh), 0);
    const widthM = solarPotential.panelWidthMeters || 1.05;
    const heightM = solarPotential.panelHeightMeters || 1.65;

    for (const panel of panels) {
      const segment = solarPotential.roofSegmentStats?.[panel.segmentIndex];
      const heading = segment?.azimuthDegrees ?? 180;
      const alongHeading = panel.orientation === "PORTRAIT" ? heightM : widthM;
      const acrossHeading = panel.orientation === "PORTRAIT" ? widthM : heightM;

      const path = panelCorners(
        geometry.spherical,
        { lat: panel.center.latitude, lng: panel.center.longitude },
        alongHeading,
        acrossHeading,
        heading
      );

      const intensity = maxEnergy > minEnergy ? (panel.yearlyEnergyDcKwh - minEnergy) / (maxEnergy - minEnergy) : 1;
      const fillColor = mode === "solar" ? solarHeatColor(intensity) : "#0f1a22";

      const polygon = new window.google.maps.Polygon({
        paths: path,
        strokeColor: mode === "solar" ? "#2b3d4a" : "#ffa501",
        strokeOpacity: 0.9,
        strokeWeight: 1,
        fillColor,
        fillOpacity: mode === "solar" ? 0.85 : 0.92,
        map,
      });
      overlaysRef.current.push(polygon);
    }
  }, [loaded, solarData, visiblePanelCount, mode]);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-nexis-card-lg">
      <div ref={containerRef} className="h-[320px] w-full sm:h-[420px] lg:h-[480px]" aria-label="Satellite view of property roof with solar panel overlay" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-nexis-dark/10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-nexis-primary border-t-transparent" />
        </div>
      )}
      <div className="absolute left-4 top-4 flex gap-2 rounded-full bg-white/95 p-1 shadow-nexis-card backdrop-blur">
        {(["satellite", "solar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              "rounded-full px-4 py-2 font-display text-xs tracking-wide transition-colors",
              mode === m ? "nexis-gradient-primary text-nexis-dark" : "text-nexis-dark/60 hover:text-nexis-dark",
            ].join(" ")}
          >
            {m === "satellite" ? "SATELLITE" : "SOLAR POTENTIAL"}
          </button>
        ))}
      </div>
    </div>
  );
}

function panelCorners(
  spherical: typeof google.maps.geometry.spherical,
  center: google.maps.LatLngLiteral,
  alongHeadingMeters: number,
  acrossHeadingMeters: number,
  headingDegrees: number
): google.maps.LatLngLiteral[] {
  const halfAlong = alongHeadingMeters / 2;
  const halfAcross = acrossHeadingMeters / 2;

  const offset = (dxAlong: number, dyAcross: number) => {
    const p1 = spherical.computeOffset(center, dyAcross, headingDegrees);
    const p2 = spherical.computeOffset(p1, dxAlong, headingDegrees + 90);
    return { lat: p2.lat(), lng: p2.lng() };
  };

  return [
    offset(-halfAcross, -halfAlong),
    offset(halfAcross, -halfAlong),
    offset(halfAcross, halfAlong),
    offset(-halfAcross, halfAlong),
  ];
}

/** Cool-to-warm heat scale (blue -> Nexis orange) for the Solar Potential view, brand-safe. */
function solarHeatColor(intensity: number): string {
  const stops = [
    { t: 0, color: [68, 90, 125] },
    { t: 0.5, color: [255, 234, 210] },
    { t: 1, color: [255, 133, 1] },
  ];
  const clamped = Math.max(0, Math.min(1, intensity));
  const lower = stops.filter((s) => s.t <= clamped).at(-1) ?? stops[0]!;
  const upper = stops.find((s) => s.t >= clamped) ?? stops[stops.length - 1]!;
  const range = upper.t - lower.t || 1;
  const localT = (clamped - lower.t) / range;
  const rgb = lower.color.map((c, i) => Math.round(c + (upper.color[i]! - c) * localT));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
