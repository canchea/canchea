import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Complejos deportivos verificados",
  description: "Explora complejos deportivos verificados por CANCHEA en Santa Cruz.",
  alternates: { canonical: "/complejos" },
};

export default async function VenuesPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const query = await searchParams;
  const sort = ["rating", "popular", "newest"].includes(query.orden ?? "") ? query.orden! : "rating";
  const supabase = await createClient();
  let venuesQuery = supabase.from("venues").select("*").eq("status", "approved");
  if (sort === "rating") venuesQuery = venuesQuery.order("rating_average", { ascending: false }).order("review_count", { ascending: false });
  else if (sort === "popular") venuesQuery = venuesQuery.order("booking_count", { ascending: false }).order("rating_average", { ascending: false });
  else venuesQuery = venuesQuery.order("approved_at", { ascending: false });
  const { data: venues } = await venuesQuery;
  const rows = venues ?? [];
  const { data: covers } = rows.length
    ? await supabase.from("venue_photos").select("venue_id, object_path, alt_text").in("venue_id", rows.map((venue) => venue.id)).eq("kind", "cover")
    : { data: [] };
  const { data: signedCovers } = covers?.length
    ? await supabase.storage.from("venue-media").createSignedUrls(covers.map((cover) => cover.object_path), 3600)
    : { data: [] };
  const urls = new Map((signedCovers ?? []).map((item) => [item.path, item.signedUrl]));
  const coverByVenue = new Map((covers ?? []).map((cover) => [cover.venue_id, { ...cover, signedUrl: urls.get(cover.object_path) }]));

  return (
    <>
      <SiteHeader />
      <main className="venues-public-page">
        <section className="venues-public-hero">
          <div className="container"><p className="eyebrow">Canchas verificadas</p><h1>Encuentra dónde jugar</h1><p>Complejos revisados por el equipo CANCHEA, con ubicación y contacto confirmados.</p></div>
        </section>
        <nav className="container venue-sort" aria-label="Ordenar complejos"><span>Ordenar:</span><Link className={sort === "rating" ? "active" : ""} href="/complejos?orden=rating">Mejor valorados</Link><Link className={sort === "popular" ? "active" : ""} href="/complejos?orden=popular">Más reservados</Link><Link className={sort === "newest" ? "active" : ""} href="/complejos?orden=newest">Nuevos</Link></nav>
        <section className="container venues-public-grid" aria-label="Complejos aprobados">
          {rows.map((venue) => {
            const cover = coverByVenue.get(venue.id);
            return (
              <Link className="public-venue-card" href={`/complejos/${venue.slug}`} key={venue.id}>
                <div className="public-venue-image">{cover?.signedUrl ? <Image alt={cover.alt_text} fill sizes="(max-width: 720px) 100vw, 380px" src={cover.signedUrl} /> : <div className="public-venue-placeholder">CANCHEA</div>}<span>Verificado</span></div>
                <div className="public-venue-body"><p>{venue.zone} · {venue.city}</p><h2>{venue.commercial_name}</h2><p className="venue-rating">★ {Number(venue.rating_average).toFixed(1)} · {venue.review_count} valoraciones</p><span>Ver detalles →</span></div>
              </Link>
            );
          })}
          {!rows.length && <div className="public-empty"><strong>Próximamente</strong><p>Los primeros complejos aparecerán aquí cuando terminen su verificación.</p></div>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
