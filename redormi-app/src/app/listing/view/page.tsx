import { Suspense } from "react";
import type { Metadata } from "next";
import ViewListingClient from "./ViewListingClient";

export const metadata: Metadata = { title: "Listing" };

export default function ViewListingPage() {
  return (
    <Suspense fallback={null}>
      <ViewListingClient />
    </Suspense>
  );
}
