/**
 * Client generates one UUID per form session and submits it with the
 * analyze request. The server uses it as the idempotency key: a repeated
 * submission (double-click, retry after a flaky network) with the same
 * submissionId updates the same SolarLead/HubSpot Deal instead of creating
 * a duplicate. See src/lib/db/leads.ts and src/lib/hubspot/deals.ts.
 */
export function generateSubmissionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older browsers).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
