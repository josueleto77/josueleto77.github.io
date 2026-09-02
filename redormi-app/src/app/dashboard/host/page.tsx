import { Suspense } from "react";
import type { Metadata } from "next";
import HostDashboardClient from "./HostDashboardClient";

export const metadata: Metadata = { title: "Host dashboard" };

export default function HostDashboardPage() {
  return (
    <Suspense fallback={null}>
      <HostDashboardClient />
    </Suspense>
  );
}
