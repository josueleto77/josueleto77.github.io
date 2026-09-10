"use client";

import { useEffect, useState } from "react";

const SCRIPT_ID = "nexis-google-maps-script";

let loadPromise: Promise<void> | null = null;

function loadScript(apiKey: string): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.maps) return resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps.")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Loads the Google Maps JavaScript API (Places + Maps + Marker libraries)
 * exactly once, using the public, browser-restricted
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Used by the address autocomplete field
 * and the satellite/solar roof visualization.
 */
export function useGoogleMapsScript() {
  const [loaded, setLoaded] = useState(() => typeof window !== "undefined" && Boolean(window.google?.maps));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps is not configured.");
      return;
    }
    let cancelled = false;
    loadScript(apiKey)
      .then(() => {
        if (!cancelled) setLoaded(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loaded, error };
}
