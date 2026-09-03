import type { ExtraService } from "@/lib/types";
import { seededPhoto } from "@/lib/utils/ids";

interface ServiceSeed {
  listingId: string;
  category: ExtraService["category"];
  name: string;
  description: string;
  pricingUnit: ExtraService["pricingUnit"];
  price: number;
  quantityAvailable: number;
  deposit?: number;
  requiresLicense?: boolean;
  ageMinimum?: number;
  cancellationPolicy: ExtraService["cancellationPolicy"];
  commissionPct: number;
}

const seeds: ServiceSeed[] = [
  {
    listingId: "lst_1",
    category: "vehicles",
    name: "Vespa scooter rental",
    description: "125cc scooter, two helmets included. Perfect for exploring Eixample and the coast road.",
    pricingUnit: "per_day",
    price: 45,
    quantityAvailable: 2,
    deposit: 200,
    requiresLicense: true,
    ageMinimum: 21,
    cancellationPolicy: "moderate",
    commissionPct: 15,
  },
  {
    listingId: "lst_1",
    category: "services",
    name: "Airport pickup",
    description: "Private transfer from BCN airport straight to the villa.",
    pricingUnit: "per_stay",
    price: 55,
    quantityAvailable: 99,
    cancellationPolicy: "flexible",
    commissionPct: 12,
  },
  {
    listingId: "lst_3",
    category: "recreation",
    name: "Paddleboard set (2)",
    description: "Two inflatable paddleboards with pumps, leashes, and dry bags.",
    pricingUnit: "per_day",
    price: 35,
    quantityAvailable: 2,
    deposit: 50,
    cancellationPolicy: "flexible",
    commissionPct: 15,
  },
  {
    listingId: "lst_3",
    category: "services",
    name: "Private chef dinner",
    description: "Three-course Balearic tasting menu, cooked in your villa kitchen.",
    pricingUnit: "per_stay",
    price: 220,
    quantityAvailable: 3,
    cancellationPolicy: "moderate",
    commissionPct: 18,
  },
  {
    listingId: "lst_6",
    category: "recreation",
    name: "Bicycles (2)",
    description: "City bikes with baskets, locks, and a route map to the temples.",
    pricingUnit: "per_day",
    price: 18,
    quantityAvailable: 4,
    cancellationPolicy: "flexible",
    commissionPct: 12,
  },
  {
    listingId: "lst_6",
    category: "services",
    name: "Guided tea ceremony",
    description: "In-home traditional tea ceremony with a certified host, 90 minutes.",
    pricingUnit: "per_item",
    price: 85,
    quantityAvailable: 6,
    cancellationPolicy: "strict",
    commissionPct: 18,
  },
  {
    listingId: "lst_10",
    category: "vehicles",
    name: "Manual scooter",
    description: "Honda Beat scooter, ideal for Ubud's rice-paddy roads.",
    pricingUnit: "per_day",
    price: 12,
    quantityAvailable: 3,
    deposit: 100,
    requiresLicense: true,
    ageMinimum: 21,
    cancellationPolicy: "moderate",
    commissionPct: 15,
  },
  {
    listingId: "lst_10",
    category: "comfort",
    name: "Crib + high chair",
    description: "Travel crib with fresh linens and a foldable high chair.",
    pricingUnit: "per_stay",
    price: 25,
    quantityAvailable: 1,
    cancellationPolicy: "flexible",
    commissionPct: 10,
  },
  {
    listingId: "lst_15",
    category: "vehicles",
    name: "4x4 SUV rental",
    description: "Manual 4x4, ideal for Milford Sound day trips. Includes snow chains in winter.",
    pricingUnit: "per_day",
    price: 95,
    quantityAvailable: 1,
    deposit: 500,
    requiresLicense: true,
    ageMinimum: 25,
    cancellationPolicy: "strict",
    commissionPct: 15,
  },
  {
    listingId: "lst_15",
    category: "recreation",
    name: "Ski equipment set",
    description: "Skis, poles, boots, and helmet — full adult set, sized to order.",
    pricingUnit: "per_day",
    price: 40,
    quantityAvailable: 6,
    cancellationPolicy: "moderate",
    commissionPct: 15,
  },
  {
    listingId: "lst_20",
    category: "recreation",
    name: "Kayak + snorkel gear",
    description: "Two sea kayaks plus snorkel masks and fins for the reef just offshore.",
    pricingUnit: "per_day",
    price: 30,
    quantityAvailable: 2,
    deposit: 50,
    cancellationPolicy: "flexible",
    commissionPct: 12,
  },
  {
    listingId: "lst_20",
    category: "services",
    name: "Mid-stay cleaning",
    description: "A full refresh clean on day 4 of stays 5 nights or longer.",
    pricingUnit: "per_item",
    price: 65,
    quantityAvailable: 99,
    cancellationPolicy: "flexible",
    commissionPct: 10,
  },
  {
    listingId: "lst_23",
    category: "comfort",
    name: "Extra bedding + BBQ grill kit",
    description: "Extra linens, pillows, and a tabletop grill with propane included.",
    pricingUnit: "per_stay",
    price: 20,
    quantityAvailable: 5,
    cancellationPolicy: "flexible",
    commissionPct: 10,
  },
  {
    listingId: "lst_24",
    category: "vehicles",
    name: "Golf cart rental",
    description: "Street-legal golf cart, seats 4, great for the Hill Country back roads.",
    pricingUnit: "per_day",
    price: 60,
    quantityAvailable: 1,
    deposit: 150,
    requiresLicense: true,
    ageMinimum: 21,
    cancellationPolicy: "moderate",
    commissionPct: 15,
  },
];

export const extraServices: ExtraService[] = seeds.map((s, i) => ({
  id: `svc_${i + 1}`,
  listingId: s.listingId,
  category: s.category,
  name: s.name,
  description: s.description,
  photos: [seededPhoto(`service-${i}`, 700, 500)],
  pricingUnit: s.pricingUnit,
  price: s.price,
  quantityAvailable: s.quantityAvailable,
  deposit: s.deposit,
  requiresLicense: s.requiresLicense,
  ageMinimum: s.ageMinimum,
  cancellationPolicy: s.cancellationPolicy,
  commissionPct: s.commissionPct,
}));

export function servicesForListing(listingId: string): ExtraService[] {
  return extraServices.filter((s) => s.listingId === listingId);
}

export const CATEGORY_LABEL: Record<ExtraService["category"], string> = {
  vehicles: "Vehicles",
  recreation: "Recreation",
  comfort: "Comfort",
  services: "Services",
};

export const PRICING_UNIT_LABEL: Record<ExtraService["pricingUnit"], string> = {
  per_day: "per day",
  per_stay: "per stay",
  per_hour: "per hour",
  per_item: "per item",
};
