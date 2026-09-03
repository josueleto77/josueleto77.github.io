import { Suspense } from "react";
import type { Metadata } from "next";
import GuestDashboardClient from "./GuestDashboardClient";

export const metadata: Metadata = { title: "Guest dashboard" };

export default function GuestDashboardPage() {
  return (
    <Suspense fallback={null}>
      <GuestDashboardClient />
    </Suspense>
  );
}
