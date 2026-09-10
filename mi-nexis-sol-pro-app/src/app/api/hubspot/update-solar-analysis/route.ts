import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateDealWithSolarResults } from "@/lib/hubspot/deals";

export const runtime = "nodejs";

const bodySchema = z.object({
  dealId: z.string().min(1),
  status: z.enum(["completed", "partial", "unavailable", "error"]),
  result: z.unknown().nullable(),
});

/**
 * Pushes (or re-pushes) solar assessment results onto an existing HubSpot
 * deal. Split out from `/api/solar/analyze` so a later retry/reconciliation
 * job (e.g. for leads whose HubSpot sync failed — see HubSpotSync.status in
 * the database) can resend results without re-running the Solar API call.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    const deal = await updateDealWithSolarResults(
      parsed.data.dealId,
      parsed.data.status,
      parsed.data.result as Parameters<typeof updateDealWithSolarResults>[2]
    );
    return NextResponse.json({ success: true, dealId: deal.id });
  } catch (err) {
    console.error("[hubspot/update-solar-analysis] failed", err);
    return NextResponse.json({ success: false, error: "Failed to update HubSpot deal." }, { status: 502 });
  }
}
