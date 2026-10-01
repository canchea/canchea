import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="error-page">
        <section className="error-card">
          <span className="error-code">Error 404</span>
          <h1>Esta página no está disponible</h1>
          <p>Puede que el enlace haya cambiado o que el complejo todavía no esté publicado.</p>
          <div className="error-actions">
            <Link className="button button--primary" href="/buscar">Buscar canchas</Link>
            <Link className="button button--dark" href="/">Volver al inicio</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
