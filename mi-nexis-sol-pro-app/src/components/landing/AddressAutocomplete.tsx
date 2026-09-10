"use client";

import { useEffect, useRef } from "react";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import type { PlaceSelection } from "@/lib/google/types";

interface AddressAutocompleteProps {
  onSelect: (place: PlaceSelection) => void;
  onChangeBeforeSelect?: () => void;
  hasError?: boolean;
}

export function AddressAutocomplete({ onSelect, onChangeBeforeSelect, hasError }: AddressAutocompleteProps) {
  const { loaded, error } = useGoogleMapsScript();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!loaded || !inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: ["us"] },
      fields: ["formatted_address", "geometry", "place_id"],
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      if (!place.formatted_address || lat === undefined || lng === undefined) {
        return;
      }

      onSelect({
        formattedAddress: place.formatted_address,
        latitude: lat,
        longitude: lng,
        placeId: place.place_id ?? null,
      });
    });

    return () => {
      listener.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        name="address"
        autoComplete="off"
        placeholder="123 Main St, Woburn, MA"
        onChange={onChangeBeforeSelect}
        disabled={!loaded && !error}
        className={[
          "w-full rounded-2xl border-2 bg-white px-5 py-4 text-base font-medium text-nexis-dark placeholder:text-nexis-dark/40",
          "focus:outline-none focus:ring-4 focus:ring-nexis-primary/30 transition-colors",
          hasError ? "border-red-400" : "border-nexis-accent focus:border-nexis-primary",
        ].join(" ")}
      />
      {error && <p className="mt-1 text-sm text-red-600">Address search is temporarily unavailable — you can still type your full address.</p>}
    </div>
  );
}
