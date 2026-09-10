import "server-only";
import { env } from "@/lib/env";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

export class HubSpotApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "HubSpotApiError";
  }
}

/**
 * Thin authenticated fetch wrapper for the HubSpot CRM API. The Private App
 * access token (HUBSPOT_ACCESS_TOKEN) is read server-side only and never
 * forwarded to, or reachable from, the browser.
 */
export async function hubspotFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.hubspotAccessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // non-JSON error body, ignore
    }
    const message =
      body && typeof body === "object" && "message" in body && typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : `HubSpot API error (HTTP ${response.status}) at ${path}`;
    throw new HubSpotApiError(message, response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
