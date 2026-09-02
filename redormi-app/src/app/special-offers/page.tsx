import type { Metadata } from "next";
import SpecialOffersClient from "./SpecialOffersClient";

export const metadata: Metadata = {
  title: "Special Offers",
  description: "Every Redormi listing with an active discount — last-minute deals and accepted-offer pricing.",
};

export default function SpecialOffersPage() {
  return <SpecialOffersClient />;
}
