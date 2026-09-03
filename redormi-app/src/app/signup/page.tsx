import type { Metadata } from "next";
import SignupWizard from "./SignupWizard";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return <SignupWizard />;
}
