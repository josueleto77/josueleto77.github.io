# FEATURES.md

Maps every requirement in the original build prompt to where it's implemented. Paths are relative to
`redormi-app/src` unless noted.

## 1–2. Project & brand system

| Requirement | Implementation |
|---|---|
| Rent + Switch, one account, roles | `lib/types.ts` (`Role`, `User.roles`), signup role picker (`app/signup/SignupWizard.tsx` step 2) |
| i18n scaffolding EN/ES | `lib/i18n/dictionaries.ts`, `lib/i18n/I18nContext.tsx`, switcher in `components/layout/Navbar.tsx` & `Footer.tsx` |
| Logo (inline SVG, coral smile + dot) | `components/logo/Logo.tsx` |
| Tagline | `Logo withTagline`, hero copy on `app/page.tsx` |
| Color tokens | `app/globals.css` `:root`/`@theme` (see README's "Design tokens" for the one deliberate AA-contrast deviation) |
| Manrope 400/600/800 | `app/layout.tsx` (`next/font/google`) |
| Trust bar | `components/layout/TrustBar.tsx`, used on `/` |

## 3. Pages & routes

Every route in the spec's table exists under `app/`, e.g. `app/search`, `app/listing/[id]`, `app/switch`,
`app/switch/match/[id]`, `app/hot-places`, `app/special-offers`, `app/login`, `app/signup`, `app/host/new`,
`app/dashboard/guest`, `app/dashboard/host`, `app/messages`, `app/messages/[threadId]`, `app/account`,
`app/legal/terms`, `app/legal/switch-agreement`. See README for why a couple of dynamic routes (new
listings, new chat threads) intentionally redirect elsewhere rather than deep-linking — a consequence of
static export having no server to render on-demand pages.

## 4.1 Search & booking (Rent)

- Hero search + Rent/Switch toggle: `components/search/SearchBar.tsx`
- Filters (price, type, beds/baths, amenities, instant book, rating, offers, Switch, services):
  `components/search/FilterSidebar.tsx`, filter logic in `lib/utils/filters.ts`
- Results grid + synced stylized map: `app/search/SearchPageClient.tsx`, `components/search/MapPanel.tsx`,
  projection math in `lib/utils/mapProjection.ts`
- Listing detail (gallery, host card, amenities, rules, cancellation policy, calendar, reviews w/
  subscores, similar homes): `app/listing/[id]/ListingDetailClient.tsx` + `components/listing/*`
- Booking box (price breakdown, Reserve, Make an offer): `components/listing/BookingBox.tsx`,
  breakdown math in `lib/utils/pricing.ts`

## 4.2 Offers system

- Offer type incl. percentage discount, status machine, 48h expiry: `lib/types.ts` (`Offer`), constants in
  `lib/utils/pricing.ts` (`OFFER_*`)
- Make an Offer modal (slider + presets, live price, message): `components/offers/MakeOfferModal.tsx`
- Accept / decline / counter, ping-pong history, auto-accept/decline thresholds on the listing:
  `components/offers/OfferCard.tsx`, actions in `lib/store/AppDataContext.tsx`
  (`createOffer`/`counterOffer`/`respondOffer`), thresholds set in the host wizard's Offers step
- Accepted offer → held reservation: `createBooking` wired from `OfferCard`'s accept action → guest dashboard Trips tab

## 4.3 Last-minute deals + area alerts

- `LastMinuteDeal` + `SearchHistoryEntry` types and seed data: `lib/data/deals.ts`
- Deal card (struck-through price, % badge, countdown, "because you searched X"):
  `components/listing/DealCard.tsx`
- Delivery surfaces: Special Offers feed (`app/special-offers`), home page section, and a seeded
  `Notification` entry (`lib/data/notifications.ts`) shown in-app (email/push are simulated, not real
  sends — there's no backend to send from)
- Host can publish a deal: quick-deal button on `app/dashboard/host/HostDashboardClient.tsx`'s Listings tab

## 4.4 Hot Places

- Ranking score (rating, review volume, booking velocity, host response rate, repeat-guest rate):
  `lib/utils/rank.ts` (`hotScore`)
- Home carousel: `app/page.tsx`. Full grid w/ region + property-type filters: `app/hot-places/HotPlacesClient.tsx`
- Flame badge: `components/listing/ListingCard.tsx`

## 4.5 Special Offers

- Feed combining last-minute deals + accepted-offer pricing, sortable by biggest % off / soonest expiring /
  closest to me (simulated distance from a fixed "you are here" point via haversine):
  `app/special-offers/SpecialOffersClient.tsx`, `lib/utils/rank.ts` (`haversineKm`)

## 4.6 Redormi Switch

- Full flow — enable, tier score, match, propose, accept/decline, add-ons, e-sign, confirm, pre-arrival
  checklist: `app/switch/SwitchLandingClient.tsx`, `app/switch/match/[id]/SwapMatchClient.tsx`
- Switch Tier scoring (property/location/owner sub-scores, 1–5, Bronze→Diamond, transparent breakdown +
  "how to raise it" tips): `lib/utils/tier.ts`, displayed via `components/switch/TierBreakdownCard.tsx`
- ±1 tier gap notice + offset via add-ons: shown in `SwapMatchClient.tsx`
- Monetization: processing fee (`lib/utils/pricing.ts` `switchProcessingFee`) + 5 add-ons (liability,
  damage protection, cleaning, key handoff, cancellation protection) with tiered pricing:
  `lib/data/switch.ts` (`swapAddOns`), cart breakdown in `SwapMatchClient.tsx`
- Sage badges/accents throughout: `Badge tone="sage"` usages, `--sage`/`--sage-dark` tokens

## 4.7 Extra services marketplace

- `ExtraService`/`ExtraServiceOrder` types (categories, pricing units, deposit, license/age gates):
  `lib/types.ts`
- Host manager (create/list/delete per listing): `components/services/ExtraServicesManager.tsx` +
  `ServiceForm.tsx`, wired into the host dashboard's "Extra services" tab and the listing wizard's
  "Services" step
- Guest-side shoppable card (waiver + license upload for vehicles/watercraft, quantity, add to trip):
  `components/services/ExtraServiceCard.tsx`, shown on the listing page, in the Switch swap flow (once
  confirmed), and post-booking on the guest dashboard's Trips tab
- Commission field on every service (`commissionPct`)

## 4.8 Messaging / chat

- Thread list + chat window (text, image attachment via local file preview, typing-indicator simulation,
  read receipts, unread badges, quick-reply templates, automated messages):
  `components/messaging/ThreadList.tsx`, `ChatWindow.tsx`, quick replies in `lib/data/messages.ts`
- Contact masking pre-booking: banner in `ChatWindow.tsx`, gated on `Booking.status`
- Seeded, populated threads (rent + Switch negotiation): `lib/data/messages.ts`

## 4.9 Accounts, auth, and the agreement

- Login (email/password, simulated Google/Apple, forgot password, optional 2FA): `app/login/page.tsx`
- Multi-step signup (identity, phone/SMS verify, DOB, address, avatar picker, ID upload, payment/payout,
  role selection): `app/signup/SignupWizard.tsx`
- Full-screen scroll-to-accept Agreement modal, capturing `acceptedAt`/`version`/simulated IP per document,
  conditionally including the Home Exchange Agreement for Switch members, re-shown whenever a document's
  version doesn't match what the user already accepted: `components/auth/AgreementModal.tsx`,
  `AppDataContext.acceptAgreement`/`hasAccepted`, history visible on `/account`
- Original legal copy, one versioned Markdown file per policy, `[DRAFT — attorney review required]`:
  `content/legal/*.md` (see README's "Legal content")
- "List your home" navbar entry point, separate from Switch signup: `components/layout/Navbar.tsx` →
  `/host/new`

## 4.10 Host listing wizard

13 steps (property type → location → capacity → amenities → photos → title/description → pricing →
availability/cancellation → house rules → offers → Switch → extra services → review & publish), draft
autosaved to `localStorage`: `app/host/new/HostWizard.tsx`. Photo step supports add/reorder/cover-select/remove.

## 5. Data model

Every type from the spec's minimum list is in `lib/types.ts`: `User`, `Profile` (folded into `User`),
`VerificationDocument`, `Listing`, `Photo`, `Amenity`, `AvailabilityCalendar` → `AvailabilityWindow`,
`PricingRule`, `Booking`, `Payment`/`Payout` (simulated inline, no separate ledger types since there's no
real payment processor), `Offer`, `CounterOffer`, `LastMinuteDeal`, `SearchHistoryEntry`, `SwitchProfile`,
`SwitchTierScore`, `SwapProposal`, `SwapAgreement`, `SwapAddOn`, `ExtraService`, `ExtraServiceOrder`,
`MessageThread`, `Message`, `Review`, `Notification`, `LegalDocumentVersion`, `AcceptanceRecord`, `Dispute`
(type defined; no UI surface built for opening/tracking a dispute — out of scope for this pass).

## 6. Technical requirements

| Requirement | Status |
|---|---|
| Next.js App Router + TS + Tailwind | ✅ |
| Postgres/Prisma/NextAuth/Stripe/Mapbox/Pusher/Resend | Deliberately **not** used — this is the brief's own "mock data" fallback path (frontend + `mockData`-equivalent + stub service layer), see README |
| Mock data + stubbed service layer | ✅ `lib/data/*` (typed mock data) + `lib/store/AppDataContext.tsx` (the service/action layer) |
| Mobile-first responsive (375/768/1440) | ✅ Tailwind responsive utilities throughout; manually checked at all three widths |
| Accessibility (keyboard nav, focus states, alt text, ARIA, 4.5:1 contrast) | Skip link + visible focus rings (`globals.css`), labeled form fields (`components/ui/Input.tsx`), `alt` on all images, `aria-*` on modals/toggles/tabs; color tokens adjusted for AA text contrast (see README) |
| Performance (lazy images, skeletons, code splitting) | `loading="lazy"` on listing/gallery images, `components/ui/Skeleton.tsx` + route `loading.tsx`, per-route code splitting is inherent to the App Router |
| SEO (semantic HTML, meta, OG, JSON-LD) | Per-route `metadata` exports, OpenGraph on root layout + listing pages, `LodgingBusiness` JSON-LD on `app/listing/[id]/page.tsx` |
| i18n | See section 1–2 above |
| Empty/loading/error/toast states | `components/ui/EmptyState.tsx`, `Skeleton.tsx`, root `loading.tsx`/`error.tsx`/`not-found.tsx`, `lib/store/ToastContext.tsx` |
| ~24 listings, ~8 Switch-enabled w/ tiers, active offers/deals, populated chat | `lib/data/listings.ts` (24 seeds, 8 `switch.enabled`), `offers.ts`, `deals.ts`, `messages.ts` |

## 7. Build order

Followed materially as specified; implementation order in this repo's history was design system → data
layer → layout/i18n → home → search → listing detail → offers → auth/legal → host wizard → Switch →
extra services → messaging → dashboards → Hot Places/Special Offers → polish (hydration-safety pass,
contrast fix, responsive/a11y check, static export + deploy).

## 8. Deliverables

- Working code: this repository, deployed at `/redormi` on the GitHub Pages site
- `README.md`: setup, build, deploy, and the notable engineering decisions (mock backend, static-export
  constraints, contrast fix)
- "Seed script": there's no imperative script — `lib/data/*.ts` **is** the typed seed data, imported
  directly by `AppDataContext`'s `initialState()`
- Design-token file: `src/app/globals.css`
- This file
