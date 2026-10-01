import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { SearchAvailabilityResult } from "@/types/database";

export type SearchResultWithImage = SearchAvailabilityResult & { signedCoverUrl: string | null };

function formatTime(value: string) {
  return value.slice(0, 5);
}

export function SearchResultCard({ result, eager = false }: { result: SearchResultWithImage; eager?: boolean }) {
  const amenities = [
    result.surface_name,
    result.has_lighting ? "Iluminación" : null,
    result.is_roofed ? "Techada" : null,
    ...result.venue_services,
    ...result.court_features,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index).slice(0, 4);
  const detailParams = new URLSearchParams({
    fecha: result.slot_date,
    hora: formatTime(result.start_time),
    cancha: result.court_id,
  });
  const bookingParams = new URLSearchParams({
    cancha: result.court_id,
    fecha: result.slot_date,
    hora: formatTime(result.start_time),
    duracion: String(result.duration_minutes),
  });

  return (
    <article className="search-result-card">
      <div className="search-result-media">
        {result.signedCoverUrl ? (
          <Image alt={result.cover_alt_text ?? `Cancha ${result.court_name}`} fill loading={eager ? "eager" : "lazy"} sizes="(max-width: 760px) 100vw, (max-width: 1120px) 42vw, 360px" src={result.signedCoverUrl} />
        ) : (
          <div className="search-result-placeholder" aria-label="Cancha sin fotografía">CANCHEA</div>
        )}
        <span className="search-result-sport">{result.sport_name}</span>
      </div>
      <div className="search-result-body">
        <div className="search-result-heading">
          <div>
            <p><Icon name="location" size={14} /> {result.venue_zone}</p>
            <h2>{result.venue_name}</h2>
          </div>
          {result.distance_km !== null ? <span className="distance-chip">{result.distance_km} km</span> : null}
        </div>
        <p className="search-result-court">{result.court_name} · {result.modality_name}</p>
        <div className="search-result-amenities" aria-label="Características">
          {amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}
        </div>
        <div className="search-result-slot">
          <div>
            <span>Horario disponible</span>
            <strong>{formatTime(result.start_time)} · {result.duration_minutes} min</strong>
          </div>
          <div className="search-result-price"><span>Precio total</span><strong>Bs {Number(result.price_bob).toFixed(0)}</strong></div>
        </div>
        <div className="search-result-actions">
          <Link className="button button--secondary" href={`/complejos/${result.venue_slug}?${detailParams.toString()}`}>Ver cancha</Link>
          <Link className="button button--primary" href={`/reservar?${bookingParams.toString()}`}>Reservar <Icon name="arrow" size={17} /></Link>
        </div>
      </div>
    </article>
  );
}
