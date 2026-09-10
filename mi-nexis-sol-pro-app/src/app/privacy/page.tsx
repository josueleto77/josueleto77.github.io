import type { Metadata } from "next";
import { SITE } from "@/lib/config";

export const metadata: Metadata = { title: `Privacy Policy | ${SITE.productName}` };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-4xl text-nexis-dark">Privacy Policy</h1>
      <p className="mt-2 text-sm text-nexis-dark/50">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-5 text-sm leading-relaxed text-nexis-dark/80">
        <p>
          {SITE.brandName} (&ldquo;Nexis Power,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) operates {SITE.productName}, a tool that
          provides homeowners with a preliminary solar assessment of their property. This policy explains what
          information we collect and how we use it.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Information We Collect</h2>
        <p>
          When you use {SITE.productName}, we collect the property address you enter, your phone number, and
          the annual electricity usage you provide. We also automatically retrieve publicly available aerial
          imagery and solar potential data for your property from Google&rsquo;s Solar API.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">How We Use Your Information</h2>
        <p>
          We use this information to generate your solar assessment, to store your assessment so you can
          revisit it later, and to follow up with you regarding your home energy assessment via phone, text,
          or email. Your information is stored in our systems and in our CRM (HubSpot) to manage that
          follow-up.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Consent to Contact</h2>
        <p>
          By submitting the form, you agree that Nexis Power may contact you regarding your home energy
          assessment. Message and data rates may apply. Providing your phone number does not constitute
          consent for unrelated marketing communications.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Data Sharing</h2>
        <p>
          We do not sell your personal information. We share information with service providers who help us
          operate {SITE.productName} (such as our CRM and hosting providers) solely to provide our services to
          you.
        </p>

        <h2 className="font-display text-xl text-nexis-dark">Contact Us</h2>
        <p>
          Questions about this policy? Contact us at {SITE.contactPhone} or through the contact options on our
          website.
        </p>
      </div>
    </div>
  );
}
