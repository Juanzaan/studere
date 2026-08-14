import type { LegalDoc } from "@/lib/legal/types";

interface LegalDocPageProps {
  doc: LegalDoc;
  otherLang: { href: string; label: string };
  backHref: string;
  backLabel: string;
}

export function LegalDocPage({ doc, otherLang, backHref, backLabel }: LegalDocPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <a href={backHref} className="text-[13px] text-c-muted transition-colors hover:text-c-text">
          ← {backLabel}
        </a>
        <h1 className="mt-3 text-2xl font-semibold text-c-text">{doc.title}</h1>
        <p className="mt-1 text-[12px] text-c-muted">
          {doc.updatedLabel}: {doc.updated}
        </p>
        <a
          href={otherLang.href}
          className="mt-3 inline-block rounded-md border border-c-border px-3 py-1 text-[12px] text-c-text transition-colors hover:bg-c-surface-2"
        >
          {otherLang.label}
        </a>
      </header>

      <p className="mb-8 text-[14px] leading-relaxed text-c-muted">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.id} className="mb-7">
          <h2 className="mb-2 text-[15px] font-semibold text-c-text">{section.heading}</h2>
          {section.paragraphs?.map((paragraph, i) => (
            <p key={i} className="mb-2 text-[13px] leading-relaxed text-c-muted">
              {paragraph}
            </p>
          ))}
          {section.list ? (
            <ul className="mb-2 list-disc pl-5">
              {section.list.map((item, i) => (
                <li key={i} className="mb-1 text-[13px] leading-relaxed text-c-muted">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {section.afterList?.map((paragraph, i) => (
            <p key={i} className="mb-2 text-[13px] leading-relaxed text-c-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}