export interface SupportFaq {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  linkLabel?: string;
  linkHref?: string;
}

// A lightweight, rule-based knowledge base — not a live LLM. Matching is
// keyword-overlap scoring (see lib/utils/supportBotMatch.ts), which is a
// deliberate, honest choice for a static, backend-free deployment: it can
// answer accurately from a fixed set of business/service/policy topics, and
// falls back to a "message our team" prompt for anything it doesn't cover,
// rather than ever inventing an answer.
export const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: "what-is-redormi",
    question: "What is Redormi?",
    keywords: ["what is redormi", "about redormi", "what does redormi do", "company"],
    answer:
      "Redormi is a travel-accommodation marketplace with two ways to travel: Redormi Rent, classic short-term rental bookings, and Redormi Switch, reciprocal home exchanges between verified members where you swap homes instead of paying rent.",
    linkLabel: "Learn more",
    linkHref: "/",
  },
  {
    id: "how-rent-works",
    question: "How does Redormi Rent work?",
    keywords: ["how does rent work", "how does renting work", "book a stay", "how to book"],
    answer:
      "Search a destination and dates, open a listing you like, and either book instantly (if the host allows Instant Book) or send a request. You can also send the host a percentage-off offer instead of paying the listed price.",
    linkLabel: "Start searching",
    linkHref: "/search",
  },
  {
    id: "how-switch-works",
    question: "How does Redormi Switch work?",
    keywords: ["how does switch work", "what is switch", "home exchange", "swap homes", "reciprocal"],
    answer:
      "Redormi Switch lets two verified members trade homes for matching dates — no nightly rate, just a small processing fee and any optional add-ons you choose. Each home carries a transparent Switch Tier score so matches feel fair, and both sides sign a Home Exchange Agreement before the swap is confirmed.",
    linkLabel: "Explore Redormi Switch",
    linkHref: "/switch",
  },
  {
    id: "switch-tier",
    question: "What is a Switch Tier score?",
    keywords: ["switch tier", "tier score", "tier gap", "how is tier calculated"],
    answer:
      "It's a transparent score (Bronze through Diamond) based on a home's photos, amenities, reviews, and verification status, used to help members find comparably matched swaps. It's informational, not an inspection or guarantee — always review the listing and message your prospective partner first.",
    linkLabel: "Switch Safety & Conduct Policy",
    linkHref: "/legal/switch-agreement",
  },
  {
    id: "switch-fees",
    question: "What does a Switch cost?",
    keywords: ["switch cost", "switch fee", "processing fee", "how much is a swap"],
    answer:
      "There's no nightly rate for a swap — just a small processing fee per owner (based on the length of stay) plus any optional add-ons you select, like a cancellation protection add-on or a deep-clean handoff.",
  },
  {
    id: "how-offers-work",
    question: "How do offers work?",
    keywords: ["make an offer", "how do offers work", "percentage off", "discount offer", "counter offer", "offer expire"],
    answer:
      "On a listing (or right inside a message thread with a host), you can request a discount from 5% up to 100% off the nightly rate, in 5% steps. The host can accept, decline, or counter with a different percentage. Offers expire automatically after 48 hours if there's no response.",
    linkLabel: "Browse listings",
    linkHref: "/search",
  },
  {
    id: "instant-book",
    question: "What is Instant Book?",
    keywords: ["instant book", "book instantly"],
    answer:
      "Listings marked Instant Book confirm your reservation immediately at checkout, no host approval needed. Other listings send a request the host has 24 hours to respond to.",
  },
  {
    id: "cancellation-policy",
    question: "What is the cancellation policy?",
    keywords: ["cancellation policy", "cancel my booking", "cancel a reservation", "flexible moderate strict"],
    answer:
      "Each listing uses one of three tiers set by the host: Flexible (full refund 24h+ before check-in), Moderate (full refund 5+ days before, 50% between 5 days and 24h), or Strict (50% refund 14+ days before). The exact tier is shown on the listing before you book.",
    linkLabel: "Read the full Cancellation Policies",
    linkHref: "/legal/terms#cancellation-policies",
  },
  {
    id: "refund-policy",
    question: "How do refunds work?",
    keywords: ["refund", "get my money back", "travel issue", "guest refund"],
    answer:
      "Beyond your cancellation tier, you may be entitled to a refund for a covered Travel Issue — like a listing being materially different than described, or being unsafe or inaccessible on arrival. Report it through your booking within 24 hours of check-in.",
    linkLabel: "Read the full Guest Refund Policy",
    linkHref: "/legal/terms#guest-refund-policy",
  },
  {
    id: "host-guarantee",
    question: "What protection do hosts have against damage?",
    keywords: ["host guarantee", "damage protection", "guest damaged my home", "property damage"],
    answer:
      "The Host Guarantee & Damage Protection policy covers eligible damage a guest causes beyond normal wear and tear, and can cover income loss from a cancelled or shortened stay in qualifying cases.",
    linkLabel: "Read the full Host Guarantee",
    linkHref: "/legal/terms#host-guarantee",
  },
  {
    id: "house-rules",
    question: "What are the house rules?",
    keywords: ["house rules", "guest standards", "quiet hours", "parties", "smoking", "pets allowed", "max occupancy"],
    answer:
      "Every stay follows baseline Guest Standards — no parties unless the listing allows them, quiet hours, no smoking indoors unless allowed, pets only where marked pet-friendly, and staying within the listed max occupancy — plus any extra rules the specific host sets on their listing.",
    linkLabel: "Read the full House Rules",
    linkHref: "/legal/terms#house-rules",
  },
  {
    id: "vehicle-rental",
    question: "What do I need to rent a vehicle?",
    keywords: ["rent a car", "vehicle rental", "rent a bike", "rent a kayak", "driver's license", "drivers license", "car rental requirements"],
    answer:
      "Motorized vehicles (cars, scooters) require a valid driver's license uploaded for verification before pickup, plus accepting the provider's liability waiver. Non-motorized gear like bikes and kayaks has no license requirement. You return a motorized vehicle with the same fuel/charge level you received it with.",
    linkLabel: "Read the full Vehicle & Equipment Rental Agreement",
    linkHref: "/legal/terms#vehicle-rental-agreement",
  },
  {
    id: "extra-services",
    question: "What are Extra Services?",
    keywords: ["extra services", "add on services", "book a service", "recreation services"],
    answer:
      "Extra Services are add-ons hosts or providers offer alongside a stay or a swap — vehicles, recreation gear, comfort upgrades, and other services — bookable from the listing or, once a swap is confirmed, from the swap page.",
  },
  {
    id: "payments-fees",
    question: "How do payments and fees work?",
    keywords: ["payments", "service fee", "how much does redormi charge", "fees"],
    answer:
      "Guests pay the nightly rate plus a cleaning fee, a service fee, and applicable taxes at checkout. Hosts receive their payout after the service fee is deducted. Switch has no nightly rate — just the processing fee and any add-ons.",
    linkLabel: "Read the full Payments & Fees policy",
    linkHref: "/legal/terms#payments-fees",
  },
  {
    id: "privacy",
    question: "What data does Redormi collect?",
    keywords: ["privacy", "my data", "what do you collect"],
    answer:
      "Our Privacy Policy covers exactly what we collect and why — including that we only request your device location to help with search and \"near me\" features, and it's never required to use the app.",
    linkLabel: "Read the full Privacy Policy",
    linkHref: "/legal/terms#privacy-policy",
  },
  {
    id: "nondiscrimination",
    question: "What is the nondiscrimination policy?",
    keywords: ["discrimination", "nondiscrimination", "equal access"],
    answer:
      "Redormi requires equal treatment of every member regardless of race, religion, national origin, disability, sex, gender identity, sexual orientation, or age — for hosts accepting bookings or swaps and guests choosing where to stay alike.",
    linkLabel: "Read the full Nondiscrimination Policy",
    linkHref: "/legal/terms#nondiscrimination-policy",
  },
  {
    id: "verification",
    question: "How does identity verification work?",
    keywords: ["verify my identity", "id verification", "government id", "verified badge"],
    answer:
      "During sign up you'll upload a government ID for review. Switch specifically requires completed ID verification before you can propose or accept a swap, since it's a higher-trust exchange than a typical booking.",
  },
  {
    id: "list-a-home",
    question: "How do I list my home?",
    keywords: ["list my home", "become a host", "add a listing", "host my property"],
    answer:
      "From your account, choose \"List your home\" to walk through the listing wizard — photos, amenities, pricing, and (optionally) enabling Redormi Switch for that listing.",
    linkLabel: "Start listing your home",
    linkHref: "/host/new",
  },
  {
    id: "message-host",
    question: "How do I message a host or my swap partner?",
    keywords: ["message the host", "chat with host", "contact the owner", "message my swap partner", "chat with switch partner"],
    answer:
      "Open any listing and use the Message button on the host's card, or, for a Switch match, the Message button on the swap page — both open a direct chat thread. Phone numbers and emails stay masked until a booking or swap is confirmed.",
    linkLabel: "Go to messages",
    linkHref: "/messages",
  },
  {
    id: "forgot-password",
    question: "I forgot my password",
    keywords: ["forgot password", "reset password", "can't log in", "cant log in"],
    answer:
      "On the log-in page, select \"Forgot password?\" and we'll send a reset link to the email on file. There's also a separate \"Forgot email?\" option if you don't remember which email your account uses.",
    linkLabel: "Go to log in",
    linkHref: "/login",
  },
  {
    id: "signup-requirements",
    question: "What do I need to sign up?",
    keywords: ["sign up requirements", "what do i need to create an account", "create account"],
    answer:
      "Sign up asks for your name, email, and password; how you'll use Redormi; a verified phone number; your date of birth and address; a profile photo; a government ID for verification; and payment or payout details depending on your role. You'll review and accept the applicable policies at the end.",
    linkLabel: "Create an account",
    linkHref: "/signup",
  },
  {
    id: "two-factor",
    question: "What is two-factor authentication?",
    keywords: ["two factor", "2fa", "authenticator"],
    answer:
      "Optional extra login security — once enabled from your Account page, you'll enter a 6-digit code at login in addition to your password.",
  },
  {
    id: "location",
    question: "Does Redormi use my location?",
    keywords: ["my location", "location detection", "near me"],
    answer:
      "With your permission, we detect your approximate location right after you log in so search can default to homes near you. You can deny the browser's location prompt and everything still works — you'll just need to type a destination.",
  },
  {
    id: "hot-places-special-offers",
    question: "What are Hot Places and Special Offers?",
    keywords: ["hot places", "special offers", "last minute deals"],
    answer:
      "Hot Places are curated homes with rising demand and top reviews. Special Offers is a feed of last-minute deals and host promotions — both are linked from the home page.",
  },
  {
    id: "contact-support",
    question: "How do I reach a human?",
    keywords: ["talk to a person", "human support", "contact support", "customer service"],
    answer:
      "I can only answer from Redormi's published business, service, and policy info. For anything account-specific or that needs a real person, message our support team and we'll pick it up from there.",
    linkLabel: "Message support",
    linkHref: "/messages",
  },
];
