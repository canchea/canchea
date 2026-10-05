import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  notice,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  notice: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <SiteHeader />
      <main className="legal-page" id="contenido">
        <header className="legal-hero">
          <div className="container legal-hero-inner">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{summary}</p>
            <div className="legal-meta">
              <span>Versión para piloto controlado</span>
              <span>Actualizado: 5 de octubre de 2026</span>
            </div>
          </div>
        </header>

        <div className="container legal-layout">
          <aside className="legal-index" aria-label="Contenido de esta página">
            <strong>En esta página</strong>
            <nav>
              {sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}
            </nav>
          </aside>

          <article className="legal-content">
            <div className="legal-notice" role="note">{notice}</div>
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.content}
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
