import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleCourtFavoriteAction, toggleVenueFavoriteAction } from "@/app/jugador/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { addDays, dateInTimeZone } from "@/lib/courts/time";
import { trackFunnelEvent } from "@/lib/analytics/track";
import { getCurrentAccount } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { CourtPhoto } from "@/types/database";

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("commercial_name, description, zone, city, slug")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!venue) return { title: "Complejo no disponible", robots: { index: false, follow: false } };

  const title = `${venue.commercial_name} en ${venue.zone}`;
  const description = venue.description || `Reserva canchas en ${venue.commercial_name}, ${venue.zone}, ${venue.city}.`;
  const canonical = `/complejos/${venue.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      locale: "es_BO",
      images: [{
        url: "/images/hero-canchea.png",
        width: 1672,
        height: 941,
        alt: `${venue.commercial_name}, complejo deportivo en ${venue.city}`,
      }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/images/hero-canchea.png"] },
  };
}

export default async function VenueDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ fecha?: string; hora?: string; cancha?: string }> }) {
  const { slug } = await params;
  const requested = await searchParams;
  const supabase = await createClient();
  const account = await getCurrentAccount();
  const { data: venue } = await supabase.from("venues").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
  if (!venue) notFound();
  await trackFunnelEvent("venue_viewed", { venueId: venue.id, actorId: account?.user.id ?? null, metadata: { date: requested.fecha, time: requested.hora } });

  const [{ data: photoRows }, { data: hours }, { data: links }, { data: courts }, { data: reviews }] = await Promise.all([
    supabase.from("venue_photos").select("*").eq("venue_id", venue.id).order("kind").order("sort_order"),
    supabase.from("venue_opening_hours").select("*").eq("venue_id", venue.id).order("day_of_week"),
    supabase.from("venue_services").select("service_id").eq("venue_id", venue.id),
    supabase.from("courts").select("*, sports(name), sport_modalities(name), court_surfaces(name), court_durations(duration_minutes), court_feature_assignments(feature_id, court_features(name))").eq("venue_id", venue.id).eq("status", "active").order("created_at"),
    supabase.from("reviews").select("id, rating, comment, created_at, courts(name)").eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const serviceIds = (links ?? []).map((link) => link.service_id);
  const { data: services } = serviceIds.length ? await supabase.from("services").select("id, name").in("id", serviceIds).order("sort_order") : { data: [] };
  const { data: signedPhotos } = photoRows?.length
    ? await supabase.storage.from("venue-media").createSignedUrls(photoRows.map((photo) => photo.object_path), 3600)
    : { data: [] };
  const urls = new Map((signedPhotos ?? []).map((item) => [item.path, item.signedUrl]));
  const photos = (photoRows ?? []).flatMap((photo) => {
    const signedUrl = urls.get(photo.object_path);
    return signedUrl ? [{ ...photo, signedUrl }] : [];
  });
  const cover = photos.find((photo) => photo.kind === "cover") ?? photos[0];
  const gallery = photos.filter((photo) => photo.kind === "gallery").slice(0, 6);
  const courtRows = courts ?? [];
  const courtIds = courtRows.map((court) => court.id);
  const isPlayer = account?.profile?.role === "player";
  const [{ data: favoriteVenue }, { data: favoriteCourts }] = isPlayer
    ? await Promise.all([
        supabase.from("favorite_venues").select("venue_id").eq("venue_id", venue.id).maybeSingle(),
        courtIds.length ? supabase.from("favorite_courts").select("court_id").in("court_id", courtIds) : Promise.resolve({ data: [] }),
      ])
    : [{ data: null }, { data: [] }];
  const favoriteCourtIds = new Set((favoriteCourts ?? []).map((item) => item.court_id));
  const { data: rawCourtPhotos } = courtIds.length
    ? await supabase.from("court_photos").select("*").in("court_id", courtIds).eq("kind", "cover")
    : { data: [] };
  const courtPhotoRows = (rawCourtPhotos ?? []) as CourtPhoto[];
  const { data: signedCourtPhotos } = courtPhotoRows.length
    ? await supabase.storage.from("venue-media").createSignedUrls(courtPhotoRows.map((photo) => photo.object_path), 3600)
    : { data: [] };
  const courtUrlByPath = new Map((signedCourtPhotos ?? []).map((item) => [item.path, item.signedUrl]));
  const courtCoverById = new Map(courtPhotoRows.flatMap((photo) => {
    const signedUrl = courtUrlByPath.get(photo.object_path);
    return signedUrl ? [[photo.court_id, { ...photo, signedUrl }] as const] : [];
  }));
  const today = dateInTimeZone(venue.timezone);
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(requested.fecha ?? "") && (requested.fecha ?? "") >= today ? requested.fecha! : today;
  const requestedTime = /^(?:[01]\d|2[0-3]):(?:00|30)$/.test(requested.hora ?? "") ? requested.hora : null;
  const requestedCourtId = /^[0-9a-f-]{36}$/i.test(requested.cancha ?? "") ? requested.cancha : null;
  const tomorrow = addDays(requestedDate, 1);
  const availabilityEntries = await Promise.all(courtRows.map(async (court) => {
    const { data } = await supabase.rpc("get_court_availability_range", {
      p_court_id: court.id,
      p_start_date: requestedDate,
      p_days: 2,
    });
    return [court.id, data ?? []] as const;
  }));
  const availabilityByCourt = new Map(availabilityEntries);
  const whatsappDigits = venue.whatsapp_e164.replace(/\D/g, "");
  const venueUrl = `${getSiteUrl()}/complejos/${venue.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "@id": `${venueUrl}#complejo`,
    name: venue.commercial_name,
    description: venue.description,
    url: venueUrl,
    telephone: venue.phone_e164,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: venue.city,
      addressRegion: "Santa Cruz",
      addressCountry: "BO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.latitude,
      longitude: venue.longitude,
    },
    ...(venue.review_count > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(venue.rating_average),
        reviewCount: venue.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    currenciesAccepted: "BOB",
  };

  return (
    <>
      <SiteHeader />
      <main className="venue-detail-page">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />
        <section className="venue-detail-hero">
          {cover && <Image alt={cover.alt_text} fill priority sizes="100vw" src={cover.signedUrl} />}
          <div className="venue-detail-overlay" />
          <div className="container venue-detail-heading"><span>Complejo verificado</span><h1>{venue.commercial_name}</h1><p>{venue.zone} · {venue.city} · ★ {Number(venue.rating_average).toFixed(1)} ({venue.review_count})</p>{isPlayer ? <form action={toggleVenueFavoriteAction}><input name="venue_id" type="hidden" value={venue.id} /><input name="return_path" type="hidden" value={`/complejos/${venue.slug}`} /><button className="favorite-button" type="submit">{favoriteVenue ? "★ Guardado" : "☆ Guardar complejo"}</button></form> : null}</div>
        </section>
        <div className="container venue-detail-layout">
          <div className="venue-detail-main">
            <section><p className="eyebrow">Sobre el complejo</p><h2>Un lugar listo para jugar</h2><p className="venue-description">{venue.description}</p></section>
            <section><p className="eyebrow">Servicios</p><h2>Todo lo que encontrarás</h2><div className="public-service-list">{(services ?? []).map((service) => <span key={service.id}>✓ {service.name}</span>)}</div></section>
            {courtRows.length > 0 && (
              <section>
                <p className="eyebrow">Canchas disponibles</p>
                <h2>Elige dónde jugar</h2>
                <div className="public-court-grid">
                  {courtRows.map((court) => {
                    const cover = courtCoverById.get(court.id);
                    const durations = court.court_durations.map((entry) => entry.duration_minutes).sort((a, b) => a - b);
                    const features = court.court_feature_assignments.flatMap((entry) => entry.court_features ? [entry.court_features.name] : []);
                    const availability = availabilityByCourt.get(court.id) ?? [];
                    const selectedSlot = court.id === requestedCourtId && requestedTime
                      ? availability.find((slot) => slot.start_time.slice(0, 5) === requestedTime)
                      : undefined;
                    const nextSlot = selectedSlot ?? availability[0];
                    const minimumPrice = availability.length ? Math.min(...availability.map((slot) => Number(slot.price_bob))) : null;
                    return (
                      <article className={court.id === requestedCourtId ? "public-court-card public-court-card--selected" : "public-court-card"} id={`cancha-${court.id}`} key={court.id}>
                        <div className="public-court-media">{cover ? <Image alt={cover.alt_text} fill sizes="(max-width: 700px) 100vw, 360px" src={cover.signedUrl} /> : <div>Cancha CANCHEA</div>}</div>
                        <div className="public-court-body">
                          {court.id === requestedCourtId && requestedTime ? <span className="selected-slot-badge">Elegiste {requestedDate} · {requestedTime}</span> : null}
                          <p>{court.sports.name} · {court.sport_modalities.name}</p>
                          <h3>{court.name}</h3>
                          {isPlayer ? <form action={toggleCourtFavoriteAction}><input name="court_id" type="hidden" value={court.id} /><input name="return_path" type="hidden" value={`/complejos/${venue.slug}#cancha-${court.id}`} /><button className="court-favorite-button" type="submit">{favoriteCourtIds.has(court.id) ? "★ Cancha guardada" : "☆ Guardar cancha"}</button></form> : null}
                          <div className="public-court-tags"><span>{court.court_surfaces.name}</span><span>{court.capacity} jugadores</span><span>{court.length_m} × {court.width_m} m</span>{court.is_roofed && <span>Techada</span>}{court.has_lighting && <span>Iluminación</span>}{features.map((feature) => <span key={feature}>{feature}</span>)}</div>
                          <footer>
                            <strong>{selectedSlot ? `Bs ${Number(selectedSlot.price_bob).toFixed(0)}` : minimumPrice === null ? "Sin precio disponible" : `Desde Bs ${minimumPrice}`}</strong>
                            <span>{nextSlot ? `${selectedSlot ? "Seleccionado" : "Próximo"}: ${nextSlot.slot_date === today ? "hoy" : nextSlot.slot_date === tomorrow ? "mañana" : nextSlot.slot_date} a las ${nextSlot.start_time.slice(0, 5)} · ${nextSlot.duration_minutes} min` : `Sin horarios en las 48 h consultadas · ${durations.join(" o ")} min`}</span>
                          </footer>
                          {selectedSlot ? (
                            <Link className="button button--primary selected-court-booking" href={`/reservar?${new URLSearchParams({ cancha: court.id, fecha: selectedSlot.slot_date, hora: selectedSlot.start_time.slice(0, 5), duracion: String(selectedSlot.duration_minutes) }).toString()}`}>
                              Reservar este horario
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            {gallery.length > 0 && <section><p className="eyebrow">Galería</p><h2>Conoce el espacio</h2><div className="public-gallery">{gallery.map((photo) => <div key={photo.id}><Image alt={photo.alt_text} fill sizes="(max-width: 700px) 100vw, 320px" src={photo.signedUrl} /></div>)}</div></section>}
            <section><p className="eyebrow">Reseñas verificadas</p><h2>Lo que dicen quienes jugaron</h2>{reviews?.length ? <div className="public-review-list">{reviews.map((review) => <article key={review.id}><div><strong>Jugador verificado</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><p>{review.comment ?? "Valoración sin comentario."}</p><small>{review.courts?.name}</small></article>)}</div> : <p className="empty-copy">Este complejo todavía no tiene reseñas.</p>}</section>
          </div>
          <aside className="venue-contact-card">
            <span className="status-dot">Información verificada</span>
            <h2>Contacto y ubicación</h2>
            <dl><div><dt>Dirección</dt><dd>{venue.address}, {venue.zone}</dd></div><div><dt>Teléfono</dt><dd>{venue.phone_e164}</dd></div></dl>
            <a className="button button--primary" href={`https://wa.me/${whatsappDigits}`} rel="noreferrer" target="_blank">Consultar por WhatsApp</a>
            <a className="button public-map-link" href={`https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`} rel="noreferrer" target="_blank">Abrir ubicación</a>
            <div className="public-hours"><h3>Horario general</h3>{(hours ?? []).map((entry) => <div key={entry.day_of_week}><span>{dayNames[entry.day_of_week]}</span><strong>{entry.is_closed ? "Cerrado" : `${entry.opens_at?.slice(0, 5)} – ${entry.closes_at?.slice(0, 5)}`}</strong></div>)}</div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
