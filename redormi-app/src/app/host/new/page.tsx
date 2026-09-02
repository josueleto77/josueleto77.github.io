import type { Metadata } from "next";
import HostWizard from "./HostWizard";

export const metadata: Metadata = { title: "List your home" };

export default function HostNewPage() {
  return <HostWizard />;
}
