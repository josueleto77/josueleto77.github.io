import type { PricingRule } from "@/lib/types";

export interface PriceBreakdown {
  nights: number;
  nightlyRate: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export function priceBreakdown(
  pricing: PricingRule,
  nights: number,
  discountPercent = 0
): PriceBreakdown {
  const base = pricing.baseNightly * (1 - discountPercent / 100);
  const nightlyRate = Math.round(base * 100) / 100;
  const subtotal = Math.round(nightlyRate * nights * 100) / 100;
  const cleaningFee = pricing.cleaningFee;
  const serviceFee = Math.round(subtotal * (pricing.serviceFeePct / 100) * 100) / 100;
  const taxes = Math.round((subtotal + cleaningFee) * (pricing.taxPct / 100) * 100) / 100;
  const total = Math.round((subtotal + cleaningFee + serviceFee + taxes) * 100) / 100;
  return { nights, nightlyRate, subtotal, cleaningFee, serviceFee, taxes, total };
}

export const OFFER_DISCOUNT_PRESETS = [5, 10, 20, 30, 50, 75, 100];
export const OFFER_MIN_DISCOUNT = 5;
export const OFFER_MAX_DISCOUNT = 100;
export const OFFER_DISCOUNT_STEP = 5;
export const OFFER_EXPIRY_HOURS = 48;

export const SWITCH_PROCESSING_FEE_BASE = 129;
export const SWITCH_PROCESSING_FEE_PER_NIGHT = 6;

export function switchProcessingFee(nights: number): number {
  return Math.round(SWITCH_PROCESSING_FEE_BASE + nights * SWITCH_PROCESSING_FEE_PER_NIGHT);
}
