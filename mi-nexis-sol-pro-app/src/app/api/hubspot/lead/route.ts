import { NextRequest, NextResponse } from "next/server";
import { hubspotLeadSchema } from "@/lib/validation/schemas";
import { upsertContact } from "@/lib/hubspot/contacts";
import { createHotDeal } from "@/lib/hubspot/deals";

export const runtime = "nodejs";

/**
 * Standalone lead-capture endpoint: creates/updates the HubSpot contact and
 * Hot Deal without running a solar analysis. Useful for the "manual solar
 * design" fallback flow and for testing the CRM integration in isolation
 * from the Solar API. `/api/solar/analyze` is the primary orchestration
 * route and calls the same lib functions directly.
 */
export async function POST(request: NextRequest) {
  const parsed = hubspotLeadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  try {
    const contact = await upsertContact({
      phone: input.phone,
      address: input.address,
      annualConsumptionKwh: input.annualConsumptionKwh,
    });

    const deal = await createHotDeal({
      contactId: contact.id,
      propertyAddress: input.address,
      phone: input.phone,
      annualConsumptionKwh: input.annualConsumptionKwh,
      submissionId: input.submissionId,
    });

    return NextResponse.json({ success: true, contactId: contact.id, dealId: deal.id });
  } catch (err) {
    console.error("[hubspot/lead] failed", err);
    return NextResponse.json({ success: false, error: "Failed to sync lead to HubSpot." }, { status: 502 });
  }
}
