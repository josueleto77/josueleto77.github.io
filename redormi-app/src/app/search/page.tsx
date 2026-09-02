import { Suspense } from "react";
import type { Metadata } from "next";
import SearchPageClient, { SearchLoadingSkeleton } from "./SearchPageClient";

export const metadata: Metadata = { title: "Search homes" };

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoadingSkeleton />}>
      <SearchPageClient />
    </Suspense>
  );
}
