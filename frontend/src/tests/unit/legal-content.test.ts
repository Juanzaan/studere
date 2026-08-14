import { describe, expect, it } from "vitest";
import { termsEs } from "@/lib/legal/terms-es";
import { termsEn } from "@/lib/legal/terms-en";
import { privacyEs } from "@/lib/legal/privacy-es";
import { privacyEn } from "@/lib/legal/privacy-en";

describe("legal documents", () => {
  it("ES and EN terms share the same section structure", () => {
    expect(termsEn.sections.map((s) => s.id)).toEqual(termsEs.sections.map((s) => s.id));
    termsEs.sections.forEach((es, i) => {
      expect(termsEn.sections[i].heading).not.toBe(es.heading);
    });
  });

  it("ES and EN privacy policies share the same section structure", () => {
    expect(privacyEn.sections.map((s) => s.id)).toEqual(privacyEs.sections.map((s) => s.id));
    privacyEs.sections.forEach((es, i) => {
      expect(privacyEn.sections[i].heading).not.toBe(es.heading);
    });
  });

  it("every document has a title, date and intro", () => {
    for (const doc of [termsEs, termsEn, privacyEs, privacyEn]) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.updated.length).toBeGreaterThan(0);
      expect(doc.intro.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBeGreaterThan(5);
    }
  });

  it("legal pages must be public: middleware is covered by E2E, but the documents must reference the processor and AI disclosure", () => {
    const allSections = [...termsEs.sections, ...privacyEs.sections];
    const allText = allSections.map((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.afterList ?? [])].join(" ")).join(" ");
    expect(allText).toMatch(/inteligencia artificial/i);
    expect(allText).toMatch(/Clerk/i);
    expect(allText).toMatch(/Azure OpenAI/i);
    expect(allText).toMatch(/URCDP|18\.331/i);
  });
});