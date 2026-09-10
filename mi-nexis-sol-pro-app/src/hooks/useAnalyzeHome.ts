"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { generateSubmissionId } from "@/lib/utils/idempotency";
import type { AnalyzeHomeResponse } from "@/types";
import type { PlaceSelection } from "@/lib/google/types";

export interface AnalyzeHomeFormState {
  place: PlaceSelection | null;
  phone: string;
  annualConsumptionKwh: string;
  consentAccepted: boolean;
}

type Status = "idle" | "analyzing" | "error";

export function useAnalyzeHome() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionId] = useState(() => generateSubmissionId());

  const submit = useCallback(
    async (form: AnalyzeHomeFormState) => {
      if (!form.place) {
        setErrorMessage("Please select your address from the dropdown.");
        return;
      }

      setStatus("analyzing");
      setErrorMessage(null);
      track("solar_analysis_started", { address: form.place.formattedAddress });

      try {
        const response = await fetch("/api/solar/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: form.place.formattedAddress,
            latitude: form.place.latitude,
            longitude: form.place.longitude,
            placeId: form.place.placeId,
            phone: form.phone,
            annualConsumptionKwh: Number(form.annualConsumptionKwh),
            consentAccepted: form.consentAccepted,
            submissionId,
          }),
        });

        const data = (await response.json()) as AnalyzeHomeResponse;

        if (data.reportId && (data.success || data.error)) {
          track(data.success ? "solar_analysis_completed" : "solar_analysis_failed", {
            reportId: data.reportId,
            errorCode: data.error?.code ?? null,
          });
          router.push(`/solar-report/${data.reportId}`);
          return;
        }

        setStatus("error");
        setErrorMessage(data.error?.message ?? "Something went wrong analyzing your home. Please try again.");
        track("solar_analysis_failed", { errorCode: data.error?.code ?? "UNKNOWN" });
      } catch {
        setStatus("error");
        setErrorMessage("We couldn't reach the server. Please check your connection and try again.");
        track("solar_analysis_failed", { errorCode: "NETWORK_ERROR" });
      }
    },
    [router, submissionId]
  );

  return { status, errorMessage, submit, submissionId };
}
