import type { Amenity } from "@/lib/types";

export const amenities: Amenity[] = [
  { id: "wifi", label: "Wifi", icon: "wifi", category: "essentials" },
  { id: "kitchen", label: "Kitchen", icon: "kitchen", category: "essentials" },
  { id: "washer", label: "Washer", icon: "washer", category: "essentials" },
  { id: "laundry", label: "Laundry", icon: "washer", category: "essentials" },
  { id: "ac", label: "Air conditioning", icon: "ac", category: "essentials" },
  { id: "heating", label: "Heating", icon: "heating", category: "essentials" },
  { id: "workspace", label: "Dedicated workspace", icon: "desk", category: "essentials" },
  { id: "tv", label: "TV", icon: "tv", category: "essentials" },
  { id: "pool", label: "Pool", icon: "pool", category: "outdoor" },
  { id: "hot_tub", label: "Hot tub", icon: "hot-tub", category: "outdoor" },
  { id: "parking", label: "Free parking", icon: "parking", category: "outdoor" },
  { id: "waterfront", label: "Waterfront", icon: "water", category: "outdoor" },
  { id: "patio", label: "Patio or balcony", icon: "patio", category: "outdoor" },
  { id: "bbq", label: "BBQ grill", icon: "bbq", category: "outdoor" },
  { id: "garden", label: "Garden view", icon: "garden", category: "outdoor" },
  { id: "gym", label: "Gym access", icon: "gym", category: "features" },
  { id: "fireplace", label: "Fireplace", icon: "fireplace", category: "features" },
  { id: "elevator", label: "Elevator", icon: "elevator", category: "features" },
  { id: "pet_friendly", label: "Pet friendly", icon: "pet", category: "features" },
  { id: "ev_charger", label: "EV charger", icon: "ev", category: "features" },
  { id: "smoke_alarm", label: "Smoke alarm", icon: "smoke", category: "safety" },
  { id: "co_alarm", label: "Carbon monoxide alarm", icon: "co", category: "safety" },
  { id: "first_aid", label: "First aid kit", icon: "first-aid", category: "safety" },
  { id: "security_cams", label: "Exterior security cameras", icon: "camera-security", category: "safety" },
];

export function amenityLabel(id: string): string {
  return amenities.find((a) => a.id === id)?.label ?? id;
}
