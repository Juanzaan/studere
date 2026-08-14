import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal-doc";
import { privacyEs } from "@/lib/legal/privacy-es";

export const metadata: Metadata = {
  title: "Política de Privacidad — Studere",
  description: "Política de Privacidad de Studere, aplicación de estudio con IA.",
};

export default function PrivacyPage() {
  return (
    <LegalDocPage
      doc={privacyEs}
      otherLang={{ href: "/en/privacy", label: "English" }}
      backHref="/"
      backLabel="Volver"
    />
  );
}