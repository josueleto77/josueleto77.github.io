import type { Metadata } from "next";
import DeleteAccountClient from "./DeleteAccountClient";

export const metadata: Metadata = { title: "Delete your account" };

export default function DeleteAccountPage() {
  return <DeleteAccountClient />;
}
