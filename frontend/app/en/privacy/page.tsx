import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal-doc";
import { privacyEn } from "@/lib/legal/privacy-en";

export const metadata: Metadata = {
  title: "Privacy Policy — Studere",
  description: "Studere Privacy Policy, an AI study application.",
};

export default function PrivacyEnPage() {
  return (
    <LegalDocPage
      doc={privacyEn}
      otherLang={{ href: "/privacy", label: "Español" }}
      backHref="/"
      backLabel="Back"
    />
  );
}