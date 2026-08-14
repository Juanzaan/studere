import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal-doc";
import { termsEn } from "@/lib/legal/terms-en";

export const metadata: Metadata = {
  title: "Terms of Service — Studere",
  description: "Studere Terms of Service, an AI study application.",
};

export default function TermsEnPage() {
  return (
    <LegalDocPage
      doc={termsEn}
      otherLang={{ href: "/terms", label: "Español" }}
      backHref="/"
      backLabel="Back"
    />
  );
}