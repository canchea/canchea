import type { Metadata } from "next";
import Link from "next/link";
import { LocationSortButton } from "@/components/search/location-sort-button";
import { SearchResultCard, type SearchResultWithImage } from "@/components/search/search-result-card";
import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Icon } from "@/components/ui/icon";
import { createPublicClient } from "@/lib/supabase/server";
import { filtersToSearchParams, normalizeSearchParams, SEARCH_PAGE_SIZE, type RawSearchParams } from "@/lib/search/params";

export const metadata: Metadata = {
  title: "Buscar canchas disponibles",
  description: "Compara canchas y horarios realmente disponibles en Santa Cruz de la Sierra.",
  alternates: { canonical: "/buscar" },
};

function paginationHref(filters: ReturnType<typeof normalizeSearchParams>, page: number) {
  return `/buscar?${filtersToSearchParams({ ...filters, page }).toString()}`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = normalizeSearchParams(await searchParams);
  const supabase = createPublicClient();
  const searchArgs = {
    p_sport_slug: filters.sport || undefined,
    p_zone: filters.zone || undefined,
    p_date: filters.date,
    p_time: filters.time || undefined,
    p_min_price_bob: filters.minPrice ?? undefined,
    p_max_price_bob: filters.maxPrice ?? undefined,
    p_duration_minutes: 60,
    p_sort: filters.sort,
    p_latitude: filters.latitude ?? undefined,
    p_longitude: filters.longitude ?? undefined,
    p_limit: SEARCH_PAGE_SIZE,
    p_offset: (filters.page - 1) * SEARCH_PAGE_SIZE,
  };
  let searchResult = await supabase.rpc("search_available_courts", searchArgs);
  for (let attempt = 1; searchResult.error && attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    searchResult = await supabase.rpc("search_available_courts", searchArgs);
  }
  const { data, error } = searchResult;
  const rows = data ?? [];
  const imagePaths = rows.flatMap((row) => row.cover_object_path ? [row.cover_object_path] : []);
  const courtIds = [...new Set(rows.map((row) => row.court_id))];
  const [signedImagesResult, ratingsResult, availabilityResults] = await Promise.all([
    imagePaths.length
      ? supabase.storage.from("venue-media").createSignedUrls(imagePaths, 3600)
      : Promise.resolve({ data: [] }),
    courtIds.length
      ? supabase.from("courts").select("id, rating_average, review_count").in("id", courtIds)
      : Promise.resolve({ data: [] }),
    Promise.all(courtIds.map((courtId) => supabase.rpc("get_court_availability_range", {
      p_court_id: courtId,
      p_start_date: filters.date,
      p_days: 1,
    }))),
  ]);
  const signedImages = signedImagesResult.data ?? [];
  const signedByPath = new Map((signedImages ?? []).map((image) => [image.path, image.signedUrl]));
  const ratingByCourt = new Map((ratingsResult.data ?? []).map((court) => [court.id, court]));
  const availabilityByCourt = new Map(courtIds.map((courtId, index) => [
    courtId,
    availabilityResults[index]?.data ?? [],
  ]));
  const results: SearchResultWithImage[] = rows.map((row) => ({
    ...row,
    signedCoverUrl: row.cover_object_path ? signedByPath.get(row.cover_object_path) ?? null : null,
    ratingAverage: Number(ratingByCourt.get(row.court_id)?.rating_average ?? 0) || null,
    reviewCount: Number(ratingByCourt.get(row.court_id)?.review_count ?? 0),
    nextSlots: (availabilityByCourt.get(row.court_id) ?? [])
      .filter((slot) => !filters.time || slot.start_time.slice(0, 5) >= filters.time)
      .slice(0, 3)
      .map((slot) => ({
        slotDate: slot.slot_date,
        startTime: slot.start_time,
        priceBob: Number(slot.price_bob),
      })),
  }));
  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const hasCoordinates = filters.latitude !== null && filters.longitude !== null;

  return (
    <>
      <a className="skip-link" href="#resultados">Saltar a los resultados</a>
      <SiteHeader />
      <main className="search-page">
        <section className="search-page-hero">
          <div className="container">
            <p className="eyebrow eyebrow--light">Disponibilidad en tiempo real</p>
            <h1>Tu próxima cancha está aquí.</h1>
            <p>Compara opciones que sí pueden reservarse en la fecha y horario elegidos.</p>
            <SearchPanel defaults={filters} showAdvanced />
          </div>
        </section>

        <section className="container search-results-section" id="resultados">
          <div className="search-results-toolbar">
            <div>
              <p className="eyebrow">Resultados</p>
              <h2>{error ? "No pudimos completar la búsqueda" : total === 1 ? "1 cancha disponible" : `${total} canchas disponibles`}</h2>
              {!error && <p>{filters.time ? `Para las ${filters.time}` : "Próximos horarios"} del {new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeZone: "America/La_Paz" }).format(new Date(`${filters.date}T12:00:00-04:00`))}</p>}
            </div>
            <div className="search-view-controls" aria-label="Vista de resultados">
              <span className="search-view-active"><Icon name="menu" size={16} /> Lista</span>
              <span className="search-view-disabled" title="Se activará cuando se apruebe un proveedor de mapas"><Icon name="location" size={16} /> Mapa <small>próximamente</small></span>
            </div>
          </div>

          <div className="search-results-meta">
            <LocationSortButton active={filters.sort === "distance" && hasCoordinates} />
            <p>La valoración usa reseñas verificadas; la popularidad usa reservas reales. Los complejos nuevos pueden aparecer con cero actividad.</p>
          </div>

          {error ? (
            <div className="search-state search-state--error" role="alert">
              <strong>La búsqueda no está disponible temporalmente.</strong>
              <p>Intenta nuevamente en unos segundos. Tus filtros se conservarán en la dirección.</p>
            </div>
          ) : results.length ? (
            <div className="search-result-grid">
              {results.map((result, index) => <SearchResultCard eager={index === 0} key={result.court_id} result={result} />)}
            </div>
          ) : (
            <div className="search-state">
              <span className="search-state-icon"><Icon name="calendar" size={30} /></span>
              <strong>No encontramos una cancha libre con estos filtros.</strong>
              <p>Prueba otra hora, quita el precio máximo o revisa una zona diferente.</p>
              <Link className="button button--dark" href={`/buscar?fecha=${filters.date}`}>Limpiar filtros</Link>
            </div>
          )}

          {!error && totalPages > 1 ? (
            <nav className="search-pagination" aria-label="Paginación de resultados">
              {filters.page > 1 ? <Link href={paginationHref(filters, filters.page - 1)}>← Anterior</Link> : <span />}
              <span>Página {filters.page} de {totalPages}</span>
              {filters.page < totalPages ? <Link href={paginationHref(filters, filters.page + 1)}>Siguiente →</Link> : <span />}
            </nav>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
