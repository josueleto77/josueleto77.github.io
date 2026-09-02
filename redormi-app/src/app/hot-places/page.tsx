import type { Metadata } from "next";
import HotPlacesClient from "./HotPlacesClient";

export const metadata: Metadata = {
  title: "Hot Places",
  description: "Top-rated Redormi homes, ranked by rating, review volume, booking velocity, and repeat guests.",
};

export default function HotPlacesPage() {
  return <HotPlacesClient />;
}
