"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Listing } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { listingHref } from "@/lib/utils/listingHref";

const BUBBLE_CLASSES = {
  default: "border-coral-dark bg-coral text-white",
  switch: "border-sage-dark bg-sage text-navy",
  active: "border-navy bg-navy text-cream",
};

function bubbleHtml(listing: Listing, active: boolean) {
  const tone = active ? "active" : listing.switch.enabled ? "switch" : "default";
  const label = listing.switch.enabled ? "Switch" : formatMoney(listing.pricing.baseNightly);
  return `<div class="rounded-full border px-2.5 py-1 text-xs font-bold shadow-md transition-transform ${
    active ? "scale-110" : ""
  } ${BUBBLE_CLASSES[tone]}">${label}</div>`;
}

export default function MapPanel({
  listings,
  activeId,
  onHover,
}: {
  listings: Listing[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Listings without real coordinates yet (e.g. a host who hasn't placed
  // their pin) would otherwise all stack up at (0,0) — "Null Island", in
  // the Gulf of Guinea — so they're left off the map entirely.
  const points = listings.filter((l) => l.lat !== 0 || l.lng !== 0);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current) return;
      const L = leaflet.default;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([20, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
      const map = mapRef.current;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      points.forEach((listing) => {
        const icon = L.divIcon({
          className: "",
          html: bubbleHtml(listing, activeIdRef.current === listing.id),
          iconSize: undefined,
        });
        const marker = L.marker([listing.lat, listing.lng], { icon }).addTo(map);
        marker.on("click", () => router.push(listingHref(listing.id)));
        marker.on("mouseover", () => onHover?.(listing.id));
        marker.on("mouseout", () => onHover?.(null));
        markersRef.current.set(listing.id, marker);
      });

      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((l) => [l.lat, l.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Re-skin just the active marker's bubble in place, without rebuilding
  // every marker on the map each time the hovered listing changes.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const listing = points.find((l) => l.id === id);
      if (!listing) return;
      el.innerHTML = bubbleHtml(listing, activeId === id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-navy/10 bg-sage/15"
    />
  );
}
