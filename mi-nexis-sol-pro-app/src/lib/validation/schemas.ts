import { z } from "zod";

// US phone numbers only for v1 (matches the "(XXX) XXX-XXXX" masked input).
const PHONE_DIGITS_REGEX = /^\d{10}$/;

export const analyzeHomeSchema = z.object({
  address: z.string().trim().min(5, "Enter a valid property address.").max(300),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  placeId: z.string().nullable().default(null),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => PHONE_DIGITS_REGEX.test(v), {
      message: "Enter a valid 10-digit US phone number.",
    }),
  annualConsumptionKwh: z.coerce
    .number({ message: "Enter your annual electricity usage in kWh." })
    .positive("Annual usage must be greater than 0.")
    .max(500_000, "That usage looks too high — please double-check your bill."),
  consentAccepted: z.literal(true, {
    message: "You must agree to be contacted before we can analyze your home.",
  }),
  submissionId: z.string().uuid(),
});

export type AnalyzeHomeInput = z.infer<typeof analyzeHomeSchema>;

export const hubspotLeadSchema = analyzeHomeSchema.omit({
  latitude: true,
  longitude: true,
  placeId: true,
});

export type HubSpotLeadInput = z.infer<typeof hubspotLeadSchema>;
