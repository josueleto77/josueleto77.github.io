import type { Metadata } from "next";
import { SITE } from "@/lib/config";

export const metadata: Metadata = { title: `Terms | ${SITE.productName}` };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-4xl text-nexis-dark">Terms of Use</h1>
      <p className="mt-2 text-sm text-nexis-dark/50">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-5 text-sm leading-relaxed text-nexis-dark/80">
        <p>
          These Terms govern your use of {SITE.productName}, provided by {SITE.brandName}. By using this tool,
          you agree to these terms.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Preliminary Estimates Only</h2>
        <p>
          Solar estimates provided by {SITE.productName} are preliminary and based on available aerial
          imagery, solar data, electricity usage information you provide, and automated calculations. They do
          not constitute an engineering certification. Final system size, production, pricing, equipment
          placement, structural suitability, and installation requirements are subject to an on-site or
          professional engineering review by Nexis Power.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">No Obligation</h2>
        <p>
          Requesting a solar assessment does not obligate you to purchase any product or service from Nexis
          Power.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Accuracy of Information</h2>
        <p>
          You agree to provide accurate information (including your address, phone number, and electricity
          usage) so that we can provide the most accurate assessment possible.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Contact Us</h2>
        <p>Questions about these terms? Contact us at {SITE.contactPhone}.</p>
      </div>
    </div>
  );
}
