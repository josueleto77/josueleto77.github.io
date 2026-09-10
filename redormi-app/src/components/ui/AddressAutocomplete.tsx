"use client";

import { useEffect, useRef, useState } from "react";
import { FieldWrap } from "@/components/ui/Input";

export interface AddressSuggestion {
  label: string;
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  lat: number;
  lng: number;
}

// Photon (Komoot's OpenStreetMap-based geocoder) — free, no API key, and
// built specifically for as-you-type address autocomplete. Runs entirely
// in the visitor's browser at runtime; this sandbox can't reach it to
// verify live results, only that the request/response handling is correct.
const PHOTON_URL = "https://photon.komoot.io/api/";

interface PhotonFeature {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
}

function toSuggestion(f: PhotonFeature): AddressSuggestion {
  const p = f.properties;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name;
  const parts = [street, p.city, p.state, p.country].filter(Boolean);
  return {
    label: parts.join(", "),
    street: street || undefined,
    city: p.city,
    region: p.state,
    country: p.country,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  };
}

export default function AddressAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (text.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(text)}&limit=5`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const results = ((data.features as PhotonFeature[]) ?? []).map(toSuggestion);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        // Network hiccup or aborted (superseded by a newer keystroke) —
        // the address field still works as a plain text input either way.
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function pick(s: AddressSuggestion) {
    onChange(s.label);
    onSelect?.(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <FieldWrap label={label} hint={hint} required={required}>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-navy/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-coral outline-none"
        />
      </FieldWrap>
      {open && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-navy/10 bg-white shadow-lg">
          {loading && <li className="px-3.5 py-2.5 text-xs text-ink/50">Searching…</li>}
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full px-3.5 py-2.5 text-left text-sm text-navy hover:bg-cream"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
