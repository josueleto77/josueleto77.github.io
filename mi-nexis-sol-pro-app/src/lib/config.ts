/**
 * Centralized, admin-configurable product constants. Nothing in the solar
 * sizing/scoring engine should hard-code a panel wattage, offset target, or
 * CTA copy directly — it should read from here. For v1 these are backed by
 * environment variables / literals; a future admin dashboard can move them
 * to a database table without touching any calculation code.
 */

/** Watts per panel. Change DEFAULT_PANEL_WATTAGE and redeploy — no code changes needed. */
export const PANEL_WATTAGE_W = Number(process.env.DEFAULT_PANEL_WATTAGE ?? 450);

/** The sizing engine targets a system producing within this % range of annual usage. */
export const TARGET_OFFSET_RANGE = { min: 0.9, max: 1.1 } as const;

/** Floor for the "Recommended" system option when the roof allows it. */
export const RECOMMENDED_OFFSET_TARGET = 1.0;

/** Below this Nexis Solar Score, copy should soften expectations (still shown, never hidden). */
export const MIN_RECOMMENDED_SOLAR_SCORE = 40;

export const NEXIS_SOLAR_SCORE_BANDS = [
  { min: 90, max: 100, category: "EXCELLENT SOLAR ROOF" },
  { min: 75, max: 89, category: "VERY GOOD" },
  { min: 60, max: 74, category: "GOOD" },
  { min: 40, max: 59, category: "FAIR" },
  { min: 0, max: 39, category: "LIMITED SOLAR POTENTIAL" },
] as const;

export const SITE = {
  brandName: "Nexis Power",
  productName: "Mi Nexis Sol Pro",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "(800) 555-0199",
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? "/#contact",
  leadSource: "Mi Nexis Sol Pro",
} as const;

export const CTA_COPY = {
  primary: "ANALYZE MY HOME",
  proposal: "GET MY NEXIS SOLAR PROPOSAL",
  talkToExpert: "TALK TO A SOLAR EXPERT",
  manualDesign: "REQUEST A MANUAL SOLAR DESIGN",
} as const;

export const BRAND_COLORS = {
  primary: "#ffa501",
  secondaryDark: "#2b3d4a",
  supportingBlue: "#445a7d",
  warmWhite: "#fafaf6",
  lightAccent: "#ffead2",
  secondaryOrange: "#ff8501",
  black: "#000000",
  white: "#ffffff",
} as const;
