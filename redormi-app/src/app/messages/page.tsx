import { Suspense } from "react";
import type { Metadata } from "next";
import MessagesClient from "./MessagesClient";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesClient />
    </Suspense>
  );
}
