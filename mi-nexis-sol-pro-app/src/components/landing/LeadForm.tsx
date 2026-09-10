"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ConsentCheckbox } from "./ConsentCheckbox";
import { AnalyzingSequence } from "@/components/solar/AnalyzingSequence";
import { useAnalyzeHome } from "@/hooks/useAnalyzeHome";
import { formatPhoneInput, toDigits } from "@/lib/utils/phone";
import { track } from "@/lib/analytics";
import { CTA_COPY } from "@/lib/config";
import type { PlaceSelection } from "@/lib/google/types";

interface FieldErrors {
  address?: string;
  phone?: string;
  kwh?: string;
  consent?: string;
}

export function LeadForm() {
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [phone, setPhone] = useState("");
  const [kwh, setKwh] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [startedTracked, setStartedTracked] = useState(false);
  const { status, errorMessage, submit } = useAnalyzeHome();

  function trackStart() {
    if (!startedTracked) {
      track("solar_form_started");
      setStartedTracked(true);
    }
  }

  function handlePlaceSelect(selected: PlaceSelection) {
    setPlace(selected);
    setErrors((prev) => ({ ...prev, address: undefined }));
    track("address_selected", { address: selected.formattedAddress });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!place) nextErrors.address = "Please select your address from the dropdown.";
    if (toDigits(phone).length !== 10) nextErrors.phone = "Enter a valid 10-digit phone number.";
    const kwhNum = Number(kwh);
    if (!kwh || Number.isNaN(kwhNum) || kwhNum <= 0) nextErrors.kwh = "Enter your annual electricity usage in kWh.";
    if (!consent) nextErrors.consent = "Please accept to be contacted before continuing.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    track("solar_form_submitted", { hasAddress: Boolean(place) });
    void submit({ place, phone, annualConsumptionKwh: kwh, consentAccepted: consent });
  }

  if (status === "analyzing") {
    return <AnalyzingSequence />;
  }

  return (
    <form onSubmit={handleSubmit} onFocus={trackStart} className="w-full space-y-5" noValidate>
      <div>
        <label className="mb-1.5 block font-display text-sm tracking-wide text-nexis-dark">Property Address</label>
        <AddressAutocomplete onSelect={handlePlaceSelect} onChangeBeforeSelect={() => setPlace(null)} hasError={Boolean(errors.address)} />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      <div>
        <label className="mb-1.5 block font-display text-sm tracking-wide text-nexis-dark">Phone Number</label>
        <input
          type="tel"
          inputMode="tel"
          placeholder="(XXX) XXX-XXXX"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          className={[
            "w-full rounded-2xl border-2 bg-white px-5 py-4 text-base font-medium text-nexis-dark placeholder:text-nexis-dark/40",
            "focus:outline-none focus:ring-4 focus:ring-nexis-primary/30 transition-colors",
            errors.phone ? "border-red-400" : "border-nexis-accent focus:border-nexis-primary",
          ].join(" ")}
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
      </div>

      <div>
        <label className="mb-1.5 block font-display text-sm tracking-wide text-nexis-dark">Annual Electricity Usage</label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="9,800"
            value={kwh}
            onChange={(e) => setKwh(e.target.value.replace(/[^\d]/g, ""))}
            className={[
              "w-full rounded-2xl border-2 bg-white px-5 py-4 pr-16 text-base font-medium text-nexis-dark placeholder:text-nexis-dark/40",
              "focus:outline-none focus:ring-4 focus:ring-nexis-primary/30 transition-colors",
              errors.kwh ? "border-red-400" : "border-nexis-accent focus:border-nexis-primary",
            ].join(" ")}
          />
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-display text-sm text-nexis-blue">
            kWh/yr
          </span>
        </div>
        <p className="mt-1 text-xs text-nexis-dark/50">You can find this on your electric bill.</p>
        {errors.kwh && <p className="mt-1 text-sm text-red-600">{errors.kwh}</p>}
      </div>

      <ConsentCheckbox checked={consent} onChange={setConsent} hasError={Boolean(errors.consent)} />
      {errors.consent && <p className="text-sm text-red-600">{errors.consent}</p>}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <Button type="submit" fullWidth>
        {CTA_COPY.primary}
      </Button>
      <p className="text-center text-xs text-nexis-dark/50">No obligation • Instant solar assessment</p>
    </form>
  );
}
