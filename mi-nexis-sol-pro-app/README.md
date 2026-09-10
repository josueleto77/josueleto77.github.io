# Mi Nexis Sol Pro

Instant homeowner solar assessment app, powered by **Nexis Power**. A homeowner enters their address, phone,
and annual electricity usage, and gets back a real Google Solar API-driven roof analysis — a Nexis Solar
Score, a recommended system size, an interactive satellite/solar map with panels overlaid on their real roof,
and up to three system options — while the lead and every result are synced server-side to HubSpot.

## Why this lives in its own app, separate from josueleto77.github.io

**GitHub Pages (the host for the rest of this repository) only serves static files** — no Node.js runtime,
no server-side secrets, no database connections. This app fundamentally needs all three:

- `/api/solar/analyze` calls the Google Solar API with a **server-only** API key and calls HubSpot with a
  **server-only** Private App access token — neither can ever reach the browser.
- It reads/writes Postgres via Prisma to durably capture every lead, independent of whether the Solar API or
  HubSpot happen to be up.

So this is a full Next.js app (App Router, no static export) meant to be deployed to a Node-capable host —
**Vercel** is the reference target below, but any Node/Postgres-capable host works. It is **not** built with
`output: 'export'` and is **not** copied into the GitHub Pages tree the way `redormi-app/` → `redormi/` is
elsewhere in this repository, because none of its server functionality would survive that export.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**, **React 19**
- **Tailwind CSS v4** for the Nexis Power brand system
- **Prisma** + **PostgreSQL** for lead/report persistence
- **Zod** for request validation
- **Google Maps Platform**: Maps JavaScript API, Places Autocomplete, Solar API
- **HubSpot CRM API** (Contacts + Deals) via a Private App access token

## Project structure

```
prisma/schema.prisma          SolarLead, SolarAnalysis, SolarSystemDesign, Property, HubSpotSync
src/app/                      Routes: landing page, /solar-report/[id], /api/*
src/app/api/solar/analyze     Main orchestration endpoint (see "How a request flows" below)
src/app/api/hubspot/*         Standalone HubSpot endpoints (lead capture, solar-result push)
src/components/landing/       Address autocomplete, phone/kWh form, consent
src/components/maps/          Satellite + "Solar Potential" roof visualization
src/components/solar/         Animated analysis sequence, Nexis Solar Score gauge
src/components/results/       Metric cards, energy comparison, roof analysis, system options, CTA
src/lib/google/               Google Solar API client (server-only)
src/lib/hubspot/               HubSpot Contacts/Deals client (server-only)
src/lib/solar/                 Solar Score, sizing engine, roof analysis, system options — the calculation core
src/lib/db/                    Prisma client + lead/analysis persistence
src/lib/config.ts              Centralized, admin-editable constants (panel wattage, offset targets, CTA copy)
```

## How a request flows

`POST /api/solar/analyze` (`src/app/api/solar/analyze/route.ts`) orchestrates the whole workflow so the
client never talks to Google Solar or HubSpot directly:

1. Rate-limit + validate the submission (Zod).
2. **Persist the lead immediately** (Postgres) — this happens *before* any external API call, so a Solar API
   or HubSpot outage can never lose a lead.
3. Create/update the HubSpot **Contact** (searched by normalized phone to avoid duplicates), then create a
   HubSpot **Deal** in the configured pipeline/hot-deal stage, associated to the contact. Idempotent on the
   client-generated `submissionId`, so a double-click or retry reuses the same deal.
4. Call the Google Solar API `buildingInsights:findClosest` for the selected lat/lng.
5. Run the calculation engine (`src/lib/solar/`): **Nexis Solar Score**, roof analysis, system size
   recommendation, and up to three system options — all derived from real Solar API fields, never fabricated.
6. Persist the full analysis to Postgres (including the raw Solar API response, kept separate from HubSpot).
7. Push the results onto the HubSpot deal, and set `solar_analysis_status` to `completed` / `partial` /
   `unavailable` / `error` so the CRM always reflects reality — even when Solar API has no coverage for the
   property, the lead and deal still exist.
8. Return a `reportId` (a UUID — the `SolarLead.id`); the client redirects to `/solar-report/{reportId}`,
   which reads the persisted results straight from Postgres.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run db:push              # creates tables from prisma/schema.prisma (needs DATABASE_URL)
npm run dev                  # http://localhost:3000
```

`npm run build` / `npm run typecheck` both pass with the schema and code as committed; `npm run db:generate`
regenerates the Prisma client after any schema change.

## What you need to provide to make this operational

### 1. Google Cloud credentials (two separate, separately-restricted keys)

- **Browser key** → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Enable **Maps JavaScript API** and **Places API**.
  Restrict it by **HTTP referrer** to your production domain(s) in Google Cloud Console → Credentials.
- **Server key** → `GOOGLE_SOLAR_API_KEY`. Enable the **Solar API**. Restrict it by IP address (your server's
  egress IPs) if your host supports static egress IPs; at minimum, restrict the API this key can call to Solar
  API only. This key is never sent to the browser.

Solar API pricing/quota is billed per Google's published rates — check your project's quota before high
traffic.

### 2. HubSpot Private App credentials

Create a Private App in your HubSpot account (Settings → Integrations → Private Apps) with these scopes:
`crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`,
`crm.objects.deals.write`. Copy the access token into `HUBSPOT_ACCESS_TOKEN`.

**Create these custom properties before going live** (Settings → Properties):

Contact properties:
| Internal name | Type |
|---|---|
| `annual_electric_usage_kwh` | Number |
| `lead_source` | Single-line text (or dropdown) |

Deal properties:
| Internal name | Type |
|---|---|
| `property_address` | Single-line text |
| `phone` | Phone number |
| `annual_consumption_kwh` | Number |
| `solar_score` | Number |
| `recommended_system_size_kw` | Number |
| `recommended_panel_count` | Number |
| `estimated_solar_production_kwh` | Number |
| `estimated_energy_offset_percent` | Number |
| `max_panel_count` | Number |
| `max_system_size_kw` | Number |
| `usable_solar_roof_area_sqft` | Number |
| `solar_suitability` | Single-line text |
| `google_solar_imagery_date` | Single-line text (or Date) |
| `lead_source` | Single-line text (or dropdown) |
| `solar_analysis_status` | Dropdown: `completed`, `partial`, `unavailable`, `error` |
| `nexis_submission_id` | Single-line text (idempotency key — hidden from layouts) |

### 3. HubSpot Pipeline ID

`HUBSPOT_PIPELINE_ID` — the internal ID of the sales pipeline solar deals should live in. Find it via
Settings → Objects → Deals → Pipelines, or the `GET /crm/v3/pipelines/deals` API.

### 4. HubSpot Hot Deal Stage ID

`HUBSPOT_HOT_DEAL_STAGE_ID` — the stage ID (within the pipeline above) new leads should land in. Same source
as above (each pipeline's `stages[].id`).

### 5. Database URL

`DATABASE_URL` — a Postgres connection string (Vercel Postgres, Neon, Supabase, RDS, etc.), typically
including `?sslmode=require`. Run `npm run db:push` (or set up `prisma migrate deploy` in your deploy
pipeline) once it's set.

### 6. Production domain

`NEXT_PUBLIC_APP_URL` — your deployed app's URL, no trailing slash (used for metadata and report links). Also
add this domain to the Google Maps browser key's HTTP referrer restriction.

## Deployment (Vercel)

1. Import this directory (`mi-nexis-sol-pro-app/`) as its own Vercel project — set the project's **Root
   Directory** to `mi-nexis-sol-pro-app`, since it lives inside the larger `josueleto77.github.io` repo.
2. Add all variables from `.env.example` in Vercel → Settings → Environment Variables.
3. Provision a Postgres database (Vercel Postgres, Neon, etc.) and set `DATABASE_URL`.
4. Add a build step (or run once manually) for `npx prisma migrate deploy` (or `db:push` for a first
   deploy) against that database.
5. Deploy. Point your production domain's DNS at Vercel, then update `NEXT_PUBLIC_APP_URL` to match and
   redeploy.

Any other Node.js host (Render, Fly.io, Railway, a self-managed Node server) works the same way — the app has
no Vercel-specific APIs.

## Panel wattage & other tunables

Every solar calculation reads panel wattage from **one place**: `DEFAULT_PANEL_WATTAGE` (env var) →
`PANEL_WATTAGE_W` in `src/lib/config.ts`. Change the env var and redeploy to re-tune every calculation — no
code changes required. Target offset range, CTA copy, and brand colors live in the same file, as a starting
point for a future admin dashboard (Section 25 of the original spec) that could move these into the database
instead of environment variables.

## Development rules this codebase follows

- **No mocked API responses in production paths.** Every Google Solar API and HubSpot call is a real
  integration against the documented REST APIs — if a credential is missing, the call fails loudly (see
  `src/lib/env.ts`) rather than silently returning fake data.
- **The Solar Score and sizing engine never fabricate data.** Every homeowner-facing number traces back to a
  real `solarPotential` field from the Solar API response, or to the homeowner's own stated consumption.
- **HubSpot never receives the raw Solar API JSON.** It gets summarized properties (see the custom property
  table above); the full raw response is stored only in Postgres (`SolarAnalysis.rawSolarApiResponse`) for
  support/debugging.
