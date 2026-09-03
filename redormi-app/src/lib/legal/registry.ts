// Client-safe metadata mirror of content/legal/*.md frontmatter.
// Keep version numbers in sync with the markdown files — bump both when a
// policy changes materially so the Agreement modal re-prompts existing users.

export interface LegalMeta {
  slug: string;
  title: string;
  version: string;
  summary: string;
}

export const CORE_AGREEMENT_DOCS: LegalMeta[] = [
  { slug: "terms-of-service", title: "Terms of Service", version: "1.0", summary: "The rules for using Redormi." },
  { slug: "privacy-policy", title: "Privacy Policy", version: "1.0", summary: "What we collect and why." },
  { slug: "guest-refund-policy", title: "Guest Refund Policy", version: "1.0", summary: "When you're entitled to a refund." },
  { slug: "host-guarantee", title: "Host Guarantee & Damage Protection", version: "1.0", summary: "Protection against damage and income loss." },
  { slug: "content-policy", title: "Content Policy", version: "1.0", summary: "Standards for listings, photos, and reviews." },
  { slug: "nondiscrimination-policy", title: "Nondiscrimination Policy", version: "1.0", summary: "Equal access for every Member." },
  { slug: "cancellation-policies", title: "Cancellation Policies", version: "1.0", summary: "Flexible, Moderate, and Strict, defined." },
  { slug: "payments-fees", title: "Payments & Fees", version: "1.0", summary: "How money moves through Rent and Switch." },
];

export const SWITCH_AGREEMENT_DOC: LegalMeta = {
  slug: "home-exchange-agreement",
  title: "Home Exchange Agreement",
  version: "1.0",
  summary: "Mutual access, liability, insurance, and condition-on-return for swaps.",
};

export const ALL_LEGAL_DOCS = [...CORE_AGREEMENT_DOCS, SWITCH_AGREEMENT_DOC];
