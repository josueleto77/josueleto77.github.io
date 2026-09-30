"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";

/**
 * Geocodes an address via OpenStreetMap's free Nominatim API (no key
 * needed) and drops a draggable pin on a real Leaflet map so a host can
 * fine-tune the exact spot — replacing the old "type your own latitude"
 * fields, which defaulted every new listing to (0, 0), the middle of the
 * ocean, if a host didn't know their own coordinates.
 */
export default function LocationPicker({
  query,
  lat,
  lng,
  onChange,
}: {
  query: string;
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPin = lat !== 0 || lng !== 0;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = leaflet.default;
      const start: [number, number] = hasPin ? [lat, lng] : [20, 0];
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(start, hasPin ? 13 : 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        placeMarker(L, map, e.latlng.lat, e.latlng.lng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });

      if (hasPin) placeMarker(L, map, lat, lng);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function placeMarker(L: any, map: LeafletMap, la: number, ln: number) {
    if (markerRef.current) {
      markerRef.current.setLatLng([la, ln]);
      return;
    }
    const marker = L.marker([la, ln], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeRef.current(pos.lat, pos.lng);
    });
    markerRef.current = marker;
  }

  async function locate() {
    if (!query.trim()) {
      setError("Enter a city and country first.");
      return;
    }
    setLocating(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!results.length) {
        setError("Couldn't find that address — try adding more detail, or click the map to drop a pin.");
        return;
      }
      const la = Number(results[0].lat);
      const ln = Number(results[0].lon);
      onChange(la, ln);
      import("leaflet").then((leaflet) => {
        const L = leaflet.default;
        const map = mapRef.current;
        if (!map) return;
        map.setView([la, ln], 13);
        placeMarker(L, map, la, ln);
      });
    } catch {
      setError("Couldn't reach the geocoding service — click the map to drop a pin manually.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase text-navy/40">Pin the exact spot</p>
        <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
          <Icon name="map-pin" className="h-3.5 w-3.5" />
          {locating ? "Locating…" : "Find on map"}
        </Button>
      </div>
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-xl border border-navy/15" />
      <p className="text-xs text-ink/50">
        {hasPin
          ? "Drag the pin or click the map to fine-tune it — exact coordinates aren't shared until a booking or swap is confirmed."
          : "Click \"Find on map\" or click anywhere on the map to drop a pin."}
      </p>
      {error && <p className="text-xs font-semibold text-coral-dark">{error}</p>}
    </div>
  );
}
