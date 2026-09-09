"use client";

import { useEffect } from "react";
import { useAppData } from "@/lib/store/AppDataContext";
import { useToast } from "@/lib/store/ToastContext";

/**
 * Silently requests the browser's geolocation once per session right after
 * a user is signed in, so search results and "near me" features can use it.
 * Reverse-geocoding (coords -> city/country) uses a free, key-less client-side
 * API — it only ever runs in the visitor's own browser, never in this build
 * environment, so it can't be verified from here beyond the request shape.
 * Fails silently on denial, timeout, or network error: this is a nice-to-have,
 * never something that should block or nag the user.
 */
export default function GeoLocationSync() {
  const { currentUser, updateUser } = useAppData();
  const toast = useToast();

  useEffect(() => {
    if (!currentUser || typeof navigator === "undefined" || !navigator.geolocation) return;
    const flagKey = `redormi_geo_prompted_${currentUser.id}`;
    if (window.sessionStorage.getItem(flagKey)) return;
    window.sessionStorage.setItem(flagKey, "1");
    if (currentUser.lastKnownCoords) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        updateUser(currentUser.id, { lastKnownCoords: { lat, lng } });
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          if (!res.ok) return;
          const data = await res.json();
          const city = data.city || data.locality || undefined;
          const country = data.countryName || undefined;
          if (city || country) {
            updateUser(currentUser.id, { city, country });
            toast?.push({ tone: "info", text: `Location detected: ${[city, country].filter(Boolean).join(", ")}` });
          }
        } catch {
          // Reverse geocoding is a nice-to-have; coords alone are still saved.
        }
      },
      () => {
        // Permission denied or unavailable — nothing to do, never nag the user.
      },
      { timeout: 8000, maximumAge: 1000 * 60 * 60 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  return null;
}
