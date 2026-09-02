import type { Metadata } from "next";
import SwitchLandingClient from "./SwitchLandingClient";

export const metadata: Metadata = {
  title: "Redormi Switch",
  description: "Swap homes with a verified owner instead of paying rent. Transparent Switch Tiers, mutual proposals, and optional protection add-ons.",
};

export default function SwitchPage() {
  return <SwitchLandingClient />;
}
