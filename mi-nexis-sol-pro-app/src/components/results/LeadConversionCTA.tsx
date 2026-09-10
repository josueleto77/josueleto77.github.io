"use client";

import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { CTA_COPY, SITE } from "@/lib/config";

export function LeadConversionCTA() {
  return (
    <div className="rounded-3xl nexis-gradient-dark px-6 py-10 text-center shadow-nexis-card-lg sm:px-10 sm:py-14">
      <h3 className="font-display text-2xl text-white sm:text-3xl">
        Your Home Looks Like a Great Candidate for Solar
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
        We&rsquo;ve already saved your assessment — no need to enter your information again.
      </p>

      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          fullWidth
          onClick={() => track("proposal_cta_clicked")}
        >
          {CTA_COPY.proposal}
        </Button>
        <a href={`tel:${SITE.contactPhone.replace(/\D/g, "")}`} className="w-full">
          <Button
            variant="outline"
            fullWidth
            className="!border-white !text-white hover:!bg-white hover:!text-nexis-dark"
            onClick={() => track("call_cta_clicked")}
          >
            {CTA_COPY.talkToExpert}
          </Button>
        </a>
      </div>
    </div>
  );
}
