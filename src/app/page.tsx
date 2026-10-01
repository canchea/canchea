import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Icon } from "@/components/ui/icon";
import { VenueCard } from "@/components/venue-card";
import { brand } from "@/config/brand";
import { homeSections, sports } from "@/data/home";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <SiteHeader />
      <main id="contenido">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-media" aria-hidden="true">
            <Image alt="" fill priority sizes="100vw" src="/images/hero-canchea.png" />
            <div className="hero-overlay" />
          </div>
          <div className="container hero-content">
            <div className="hero-copy">
              <p className="eyebrow eyebrow--light"><Icon name="spark" size={17} /> Reserva. Juega. Disfruta.</p>
              <h1 id="hero-title">Encuentra dónde <span>jugar</span></h1>
              <p>{brand.description}</p>
              <div className="trust-row">
                <span><Icon name="shield" size={17} /> Reserva clara</span>
                <span>Precios en bolivianos</span>
              </div>
            </div>
            <SearchPanel />
          </div>
        </section>

        <section className="sport-strip" aria-label="Deportes disponibles">
          <div className="container sport-grid">
            {sports.map((sport, index) => (
              <Link href={`/buscar?deporte=${encodeURIComponent(sport.name)}&hora=20%3A00`} key={sport.name} className="sport-link">
                <span className={`sport-symbol sport-symbol--${index + 1}`} aria-hidden="true">{sport.name.charAt(0)}</span>
                <span><strong>{sport.name}</strong><small>{sport.detail}</small></span>
                <Icon name="arrow" size={18} />
              </Link>
            ))}
          </div>
        </section>

        <section className="how-section" id="como-funciona" aria-labelledby="how-title">
          <div className="container how-grid">
            <div>
              <p className="eyebrow">Una cancha, tres pasos</p>
              <h2 id="how-title">Menos coordinación.<br />Más tiempo jugando.</h2>
            </div>
            <ol className="steps-list">
              <li><span>01</span><div><strong>Elige tu deporte</strong><p>Filtra por zona, fecha y hora.</p></div></li>
              <li><span>02</span><div><strong>Compara opciones</strong><p>Ve instalaciones, precio y disponibilidad.</p></div></li>
              <li><span>03</span><div><strong>Asegura tu horario</strong><p>Reserva con una seña desde Bs 50.</p></div></li>
            </ol>
          </div>
        </section>

        <div id="explorar" className="venue-sections">
          <div className="container demo-note" role="note">
            <span>Vista de diseño</span>
            <p>Estas tarjetas siguen siendo una muestra visual. El buscador superior ya consulta disponibilidad y precios reales.</p>
          </div>
          {homeSections.map((section) => (
            <section className="venue-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <div className="container">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{section.eyebrow}</p>
                    <h2 id={`${section.id}-title`}>{section.title}</h2>
                    <p>{section.description}</p>
                  </div>
                  <Link className="text-link" href="/buscar">Ver disponibilidad real →</Link>
                </div>
                <div className={`card-grid ${section.venues.length === 2 ? "card-grid--two" : ""}`}>
                  {section.venues.map((venue) => <VenueCard key={`${section.id}-${venue.name}`} venue={venue} />)}
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="owner-section" id="para-complejos" aria-labelledby="owner-title">
          <div className="container owner-card">
            <div className="owner-orbit" aria-hidden="true"><span /><span /><span /></div>
            <div className="owner-copy">
              <p className="eyebrow eyebrow--light">Para complejos deportivos</p>
              <h2 id="owner-title">Convierte tus horarios libres en nuevas reservas.</h2>
              <p>Registra tu complejo, presenta sus servicios y completa la verificación para aparecer en CANCHEA.</p>
            </div>
            <Link className="button button--accent" href="/auth/registro">Registrar mi complejo</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
