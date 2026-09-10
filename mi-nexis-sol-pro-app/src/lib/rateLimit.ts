/**
 * Minimal in-memory sliding-window rate limiter for the analyze endpoint.
 *
 * This is process-local: fine for a single Node server instance or as a
 * cheap first line of defense, but it resets on redeploy and does not share
 * state across serverless instances. For multi-instance production traffic,
 * swap the Map below for Upstash Redis / Vercel KV using the same
 * `check()` signature.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const existing = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (existing.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, existing);
    return { allowed: false, remaining: 0 };
  }

  existing.push(now);
  hits.set(key, existing);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.length };
}

/** Periodic cleanup so the Map doesn't grow unbounded on a long-lived server. */
export function pruneRateLimitStore() {
  const windowStart = Date.now() - WINDOW_MS;
  for (const [key, timestamps] of hits.entries()) {
    const active = timestamps.filter((t) => t > windowStart);
    if (active.length === 0) hits.delete(key);
    else hits.set(key, active);
  }
}
