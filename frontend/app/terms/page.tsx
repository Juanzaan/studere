import type { Metadata } from "next";
import { LegalDocPage } from "@/components/legal-doc";
import { termsEs } from "@/lib/legal/terms-es";

export const metadata: Metadata = {
  title: "Términos de Servicio — Studere",
  description: "Términos de Servicio de Studere, aplicación de estudio con IA.",
};

export default function TermsPage() {
  return (
    <LegalDocPage
      doc={termsEs}
      otherLang={{ href: "/en/terms", label: "English" }}
      backHref="/"
      backLabel="Volver"
    />
  );
}