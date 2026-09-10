/**
 * Thin, provider-agnostic analytics facade. Swap `dispatch` for a real
 * provider (GA4, Segment, PostHog, HubSpot tracking code, …) without
 * touching any call site — every component just calls `track(...)`.
 */

export type AnalyticsEvent =
  | "solar_form_started"
  | "address_selected"
  | "solar_form_submitted"
  | "solar_analysis_started"
  | "solar_analysis_completed"
  | "solar_analysis_failed"
  | "proposal_cta_clicked"
  | "call_cta_clicked";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

function dispatch(event: AnalyticsEvent, payload?: AnalyticsPayload) {
  if (typeof window === "undefined") return;

  const w = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };

  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({ event, ...payload });
  } else if (typeof w.gtag === "function") {
    w.gtag("event", event, payload);
  } else if (process.env.NODE_ENV !== "production") {
    // No analytics provider wired up yet — log so events are still visible in dev.
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, payload);
  }
}

export function track(event: AnalyticsEvent, payload?: AnalyticsPayload) {
  dispatch(event, payload);
}
