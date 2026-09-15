# Redormi

A full travel-accommodation marketplace: **Redormi Rent** (classic short-term rental) and **Redormi Switch**
(reciprocal home exchange — no rent, just a processing fee and optional add-ons).

This is a **frontend-only build**: Next.js (App Router) + TypeScript + Tailwind CSS v4, statically exported
(`output: 'export'`) and deployed as a subfolder of a GitHub Pages user site, at
**https://josueleto77.github.io/redormi/**. There is no real backend — every "API" is a typed mock-data
layer plus a client-side service layer that persists state to `localStorage`, so the whole product is
interactive and demoable without a server. See [`FEATURES.md`](./FEATURES.md) for a full requirements map.

## Quick start

```bash
npm install
npm run dev       # http://localhost:3000/redormi/
```

The app is served under the `/redormi` base path even in development, to match the production deployment —
follow the link Next.js prints, or open `http://localhost:3000/redormi/` directly.

**Demo login:** the app boots already "logged in" as the seed user `jordan@redormi.demo` (any password
works — auth is simulated) so every dashboard, offer, and swap is populated from the first click. Use the
navbar's account menu to log out, or visit `/signup` to create a fresh mock account.

## Build & deploy

```bash
npm run build      # regenerates content/legal → src/lib/legal/generated.ts, then `next build`
```

This produces a static site in `redormi-app/out/`. To (re)publish it to the live site:

```bash
# from the repo root
rm -rf redormi
mkdir redormi
cp -r redormi-app/out/. redormi/
git add redormi .nojekyll
git commit -m "Deploy redormi static build"
git push
```

Two things make this work on GitHub Pages, and matter if you ever restructure the deploy:

- **`.nojekyll`** — a zero-byte file at the **repository root**. GitHub Pages runs Jekyll by default, which
  silently ignores any folder starting with `_` (Next's `_next/` asset folder, critically). Without this
  file the entire site breaks with no build error.
- **`basePath`/`assetPrefix`** in `next.config.ts` are hardcoded to `/redormi` so every asset URL and
  internal link resolves correctly once the export is nested under that path.

## Project structure

```
content/legal/*.md        Source-of-truth legal copy (see "Legal content" below)
scripts/build-legal.mjs   Compiles those .md files into a typed TS module
src/app/                  Routes (App Router) — one folder per path in the spec's route table
src/components/           UI primitives, layout, and feature components (listing, offers, switch, …)
src/lib/data/             Typed mock data: users, listings, reviews, offers, deals, messages, switch, …
src/lib/store/            AppDataContext (the "backend") + ToastContext — see below
src/lib/utils/            Pricing, Switch-tier scoring, filters, formatting, seeded mock-data clock
src/lib/i18n/             EN/ES dictionaries + a React context (see "i18n" below)
```

### The mock "backend": `AppDataContext`

`src/lib/store/AppDataContext.tsx` is a single React context that holds the entire app's mutable state
(users, listings, offers, swaps, threads/messages, bookings, extra services, saved homes, notifications,
legal acceptances). It's seeded from `src/lib/data/*` on first load, persisted to `localStorage` after that,
and exposes one action per user-facing operation (`createOffer`, `counterOffer`, `respondOffer`,
`createSwap`, `signAgreement`, `sendMessage`, `createBooking`, `orderService`, `createListing`, …). Every
page reads and mutates through `useAppData()` — swap this file's internals for real API calls and nothing
above it needs to change, which is the point of keeping it as one seam.

**Resetting the demo:** clear `localStorage` (key `redormi_state_v1`) in your browser devtools, or open the
site in a private window, to go back to the original seed data.

### Legal content

Each policy — Terms of Service, Privacy, Guest Refund, Host Guarantee, Content, Nondiscrimination,
Cancellation Policies, Payments & Fees, and the Switch-specific Home Exchange Agreement — is its own
versioned Markdown file in `content/legal/`, each `[DRAFT — attorney review required]`. `npm run build` (and
`npm run dev`, via `predev`) runs `scripts/build-legal.mjs`, which compiles them into
`src/lib/legal/generated.ts`. Counsel can edit the `.md` files directly without touching any TypeScript; the
generated file is a build artifact and shouldn't be hand-edited. The full text renders at `/legal/terms` and
`/legal/switch-agreement`, and the same content powers the scroll-to-accept Agreement modal shown at signup.

### i18n

`src/lib/i18n/dictionaries.ts` holds `en` and `es` dictionaries behind a shared `Dictionary` interface, with
`I18nProvider`/`useI18n()` wiring a live language switcher (navbar + footer) that persists to
`localStorage`. Shared chrome (nav, trust bar, footer, common buttons) is fully translated; most page body
copy is still English-only — the scaffolding is in place to extend it page by page.

### Why some dynamic routes redirect instead of deep-linking

`output: 'export'` prerenders a fixed set of HTML files at build time (via `generateStaticParams`), so a
route like `/listing/[id]` only exists for the 24 seeded listings — the host wizard's "Publish" step
therefore redirects to `/dashboard/host` rather than a listing page that doesn't exist as a static file.
Chat threads are similar: the 5 seeded conversations get pretty `/messages/[threadId]` URLs, but any new
thread created at runtime (e.g. "Contact host") opens via `/messages?thread=<id>` instead, since that query
param works for an arbitrarily-created ID with no server involved.

### A note on mock dates

Seed data (offers, deals, bookings, swap proposals, message timestamps) is generated from a **fixed**
reference date (`src/lib/utils/seedClock.ts`) rather than `Date.now()`. Static export prerenders each page
once at build time and then hydrates it again in the browser, re-running this module from scratch — if it
used the real clock, the two runs would compute different dates and React would throw a hydration mismatch
on every page. Live, user-driven interactions (booking dates, offer dates) still use the real clock, but
only ever inside `useEffect`/event handlers so they never leak into the server-rendered HTML. Practically
this means the demo's "expires in Xh" countdowns and last-minute deals are relative to whenever this was
last built — rebuild to refresh them.

### Images

Listing photos use `https://picsum.photos/seed/...` and avatars use `https://i.pravatar.cc/...` — both
public, key-free placeholder services chosen so ~24 listings' worth of photography didn't need to ship as
binary assets in the repo.

## Design tokens

`src/app/globals.css` defines the brand palette as CSS custom properties feeding Tailwind v4's `@theme`
block (no separate `tailwind.config.js`):

| Token | Hex | Notes |
|---|---|---|
| `--navy` | `#172A3A` | Primary — headers, footer, body text |
| `--coral` | `#C24B2E` | Accent — CTAs, links, active states, price highlights |
| `--coral-bright` | `#E97858` | The exact brand swatch from the brief; reserved for the logo mark and small decorative accents |
| `--cream` | `#F7F4EE` | Page background |
| `--sage` | `#A8B5A2` | Switch-mode badges, success states |
| `--ink` | `#242424` | Deep text |

**Why `--coral` isn't the brief's literal `#E97858`:** that swatch renders at ~2.8:1 contrast against white,
under WCAG AA's 4.5:1 minimum for text — and the brief also requires AA compliance. `--coral` is a deeper,
same-hue shade (~4.8:1) used everywhere the color carries text or sits under a button label; `--coral-bright`
keeps the exact spec'd hex for the logo's smile-arc and dot, and other purely decorative accents, where
brand fidelity matters most and contrast rules don't apply.

Typography is Manrope (400/600/800) via `next/font/google`.

## Payments (Stripe)

Guests pay through Stripe Checkout; hosts get paid out via Stripe Connect (Express accounts) — Redormi takes
its service fee as a Stripe `application_fee_amount` on each charge, so money splits automatically without
Redormi ever holding guest funds. Since the site is a static export, the pieces that need the Stripe secret
key can't live in the frontend — they're three Supabase Edge Functions in `supabase/functions/`:

- **`stripe-connect-onboarding`** — creates a host's Stripe Express account (once) and a fresh onboarding
  link each time they click "Connect with Stripe" on their dashboard's Earnings tab.
- **`stripe-checkout`** — creates a Checkout Session for one of the caller's own bookings, paying out to the
  listing host's connected account minus the service fee. This is what the guest dashboard's "Pay now"
  button calls.
- **`stripe-webhook`** — Stripe calls this directly (no Supabase session) on `checkout.session.completed`
  (marks the booking paid + confirmed) and `account.updated` (updates the host's payout status).

None of this is deployed yet — I don't have your Stripe account or Supabase CLI access, so these steps are
yours to run:

```bash
# 1. Create a Stripe account (stripe.com) if you don't have one, then grab your
#    test-mode secret key from the Dashboard (Developers -> API keys).

# 2. Install the Supabase CLI and log in, if you haven't already:
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # find this in your Supabase project's URL/settings

# 3. Set the secrets the functions need:
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# 4. Deploy the three functions:
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt

# 5. In the Stripe Dashboard -> Developers -> Webhooks, add an endpoint pointing at:
#    https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
#    Subscribe it to `checkout.session.completed` and `account.updated`.
#    Copy the signing secret it gives you (whsec_...) and set it too:
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Test-mode Stripe accounts work end-to-end without real money — use Stripe's [test card
numbers](https://docs.stripe.com/testing) (e.g. `4242 4242 4242 4242`) to pay, and Stripe's test-mode Connect
onboarding accepts fake business/bank details. Switch to live-mode keys only once you're ready to move real
money, and note Stripe requires its own business verification before a live Connect account can accept
charges.

Like the rest of the real backend, this only works for a real (non-demo) signed-in account, and — since
`bookings.listing_id` is a real foreign key — only for a booking on a listing actually created through the
host wizard. The demo account never sees any of this UI.

## Mobile apps (Android + iOS)

The native shells live in `android/` and `ios/`, generated by [Capacitor](https://capacitorjs.com/), which
wraps the same static export in a thin native WebView container — there's no separate mobile codebase to
maintain, no React Native rewrite. `capacitor.config.ts` points both platforms at `capacitor-www/`, a
basePath-free build of the site (the GitHub Pages deploy needs the `/redormi` basePath; the native shell
serves the export from its own origin and needs none — see the `BUILD_TARGET=capacitor` switch in
`next.config.ts`).

```bash
npm run build:capacitor   # next build (no basePath) → capacitor-www/
npm run cap:sync          # build:capacitor + npx cap sync (copies www into android/ and ios/)
npm run cap:android       # cap:sync + opens the project in Android Studio
npm run cap:ios           # cap:sync + opens the project in Xcode (macOS only)
```

Run `cap:sync` (or at least `npx cap sync`) after *any* change to the web app before rebuilding a native
binary — the native projects only ever see whatever was last copied into `capacitor-www/`.

App icon and splash screen source files are under `assets/` (custom-mode inputs for `@capacitor/assets`);
regenerate all platform sizes with:

```bash
npx @capacitor/assets generate --android --ios \
  --iconBackgroundColor '#172a3a' --iconBackgroundColorDark '#172a3a' \
  --splashBackgroundColor '#f7f4ee' --splashBackgroundColorDark '#172a3a'
```

(omit `--android --ios` and it will also emit a `public/manifest.webmanifest` + top-level `icons/` for a PWA
build we aren't using yet — harmless, but unused clutter.)

### Android — building an APK/AAB

This sandbox's network policy blocks `dl.google.com` (where the Android SDK's platform/build-tools packages
are hosted), so no APK could be compiled in this session — the Gradle project is complete and ready to build
the moment it's opened somewhere with normal internet access (a real machine or CI):

```bash
cd android
./gradlew assembleDebug     # unsigned debug APK → app/build/outputs/apk/debug/
./gradlew bundleRelease     # release AAB for Play Store → app/build/outputs/bundle/release/
```

or simply open `android/` in Android Studio and hit Run — it will prompt to install any missing SDK
platform/build-tools (currently `compileSdk`/`targetSdk` 36, see `android/variables.gradle`) automatically.

**To publish to Google Play:** you need a [Play Console](https://play.google.com/console) account (one-time
$25 fee), a signing key (`keytool -genkey -v -keystore redormi.keystore -keyalg RSA -keysize 2048 -validity
10000 -alias redormi`) wired into `android/app/build.gradle`'s `signingConfigs`, and a `bundleRelease` AAB
uploaded to a new app listing (screenshots, description, privacy policy URL — `/legal/terms` on the deployed
site works for that).

### iOS — building for the App Store

Building and code-signing an iOS app requires Xcode, which only runs on macOS — neither exists in this
sandbox, so this project ships the complete Xcode project (`ios/App/App.xcworkspace`) unbuilt. On a Mac:

```bash
npm run cap:ios     # or: npx cap sync ios && npx cap open ios
```

Then in Xcode: select the `App` target → **Signing & Capabilities** → set your Apple Developer Team → pick a
real device or **Any iOS Device** → **Product ▸ Archive** → **Distribute App** to upload to App Store
Connect.

**To publish to the App Store:** you need an [Apple Developer Program](https://developer.apple.com/programs/)
membership ($99/year), an App Store Connect listing (screenshots, description, privacy policy URL, App
Privacy questionnaire), and to submit the archived build for App Review.

## What's not real

This is explicitly the "mock data" path from the build brief. No Stripe, no Prisma/Postgres, no NextAuth, no
Mapbox, no real email/SMS. Payments, ID verification, OAuth, and 2FA are all simulated with toasts and fake
delays; the `/search` map is a stylized, non-geographic placeholder (see `MapPanel.tsx`) rather than a real
Mapbox/Google Maps embed. Everything is written behind named service functions/context actions specifically
so a real backend can be swapped in without touching the components that call them.
