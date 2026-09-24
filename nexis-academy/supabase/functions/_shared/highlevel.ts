// ============================================================
// _shared/highlevel.ts — thin helper for sending a transactional email
// through a HighLevel (GoHighLevel) sub-account, used by both
// send-onboarding-reminders and notify-new-task.
//
// HighLevel's email send is contact-centric: there's no "just send this
// email address a message" endpoint, so this first upserts a contact by
// email (creates one if it doesn't exist yet, returns the existing one
// otherwise -- no duplicates), then sends the email to that contact via
// the Conversations API.
//
// HIGHLEVEL_API_KEY: a Private Integration token (Settings -> Private
// Integrations in the HighLevel sub-account), NOT the old API v1 key.
// HIGHLEVEL_LOCATION_ID: the sub-account's Location ID (Settings ->
// Business Profile, or the URL when viewing the sub-account).
// ============================================================
const HL_BASE = 'https://services.leadconnectorhq.com';
const HL_VERSION = '2021-07-28';

export interface HLEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendHighLevelEmail(opts: {
  apiKey: string;
  locationId: string;
  toEmail: string;
  toName?: string;
  subject: string;
  html: string;
}): Promise<HLEmailResult> {
  const headers = {
    Authorization: 'Bearer ' + opts.apiKey,
    Version: HL_VERSION,
    'Content-Type': 'application/json'
  };

  var nameParts = (opts.toName || '').trim().split(/\s+/);
  var firstName = nameParts[0] || undefined;
  var lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

  let contactId: string | null = null;
  try {
    const upsertRes = await fetch(HL_BASE + '/contacts/upsert', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId: opts.locationId,
        email: opts.toEmail,
        firstName: firstName,
        lastName: lastName
      })
    });
    const upsertBody = await upsertRes.json().catch(() => ({} as any));
    if (!upsertRes.ok) {
      return { ok: false, error: 'HighLevel contact upsert failed: HTTP ' + upsertRes.status + ': ' + JSON.stringify(upsertBody) };
    }
    // The exact response shape isn't confirmed against a live HighLevel
    // account yet -- log it and handle both documented shapes (a bare
    // contact object, or { contact: {...} }) defensively.
    console.log('HighLevel contact upsert response:', JSON.stringify(upsertBody));
    contactId = (upsertBody && (upsertBody.contact?.id || upsertBody.id)) || null;
    if (!contactId) {
      return { ok: false, error: 'HighLevel contact upsert did not return a contact id: ' + JSON.stringify(upsertBody) };
    }
  } catch (e) {
    return { ok: false, error: 'Could not reach HighLevel (contact upsert): ' + (e instanceof Error ? e.message : String(e)) };
  }

  try {
    const sendRes = await fetch(HL_BASE + '/conversations/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'Email',
        contactId: contactId,
        subject: opts.subject,
        html: opts.html
      })
    });
    const sendBody = await sendRes.json().catch(() => ({} as any));
    console.log('HighLevel send message response:', JSON.stringify(sendBody));
    if (!sendRes.ok) {
      return { ok: false, error: 'HighLevel email send failed: HTTP ' + sendRes.status + ': ' + JSON.stringify(sendBody) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Could not reach HighLevel (send message): ' + (e instanceof Error ? e.message : String(e)) };
  }
}
