import type { Metadata } from "next";
import SpecialOffersClient from "./SpecialOffersClient";

export const metadata: Metadata = {
  title: "Special Offers — Exclusive Deals & Discounts",
  description:
    "Discover exclusive discounts, last-minute escapes, and special offers on beautiful stays around the world — every Redormi listing with an active, verified discount.",
};

export default function SpecialOffersPage() {
  return <SpecialOffersClient />;
}
