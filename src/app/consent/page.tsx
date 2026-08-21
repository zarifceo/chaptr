import type { Metadata } from "next";
import { PolicyConsent } from "@/components/policy-consent";

export const metadata: Metadata = {
  title: "Review policies · Chaptr",
  description: "Review and accept the current Chaptr Terms of Service and Privacy Policy.",
};

export default function ConsentPage() {
  return <PolicyConsent />;
}
