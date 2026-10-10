import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { SearchAvailabilityResult } from "@/types/database";

export type SearchResultSlot = {
  slotDate: string;
  startTime: string;
  priceBob: number;
};

export type SearchResultWithImage = SearchAvailabilityResult & {
  signedCoverUrl: string | null;
  ratingAverage: number | null;
  reviewCount: number;
  nextSlots: SearchResultSlot[];
};

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
    desde: result.slot_date,
    cancha: result.court_id,
  });

  const reservationHref = (slot: SearchResultSlot) => `/reservar?${new URLSearchParams({
    cancha: result.court_id,
    fecha: slot.slotDate,
    hora: formatTime(slot.startTime),
    duracion: "60",
  }).toString()}`;

  return (
    <article className="search-result-card">
      <div className="search-result-media">
        {result.signedCoverUrl ? (
          <Image alt={result.cover_alt_text ?? `Cancha ${result.court_name}`} fill loading={eager ? "eager" : "lazy"} sizes="(max-width: 760px) 100vw, (max-width: 1120px) 42vw, 360px" src={result.signedCoverUrl} unoptimized />
        ) : (
          <div className="search-result-placeholder" aria-label="Cancha sin fotografía">CANCHEA</div>
        )}
        <span className="search-result-sport">{result.sport_name}</span>
        <span className="search-result-verified"><Icon name="shield" size={13} /> Verificado</span>
      </div>
      <div className="search-result-body">
        <div className="search-result-heading">
          <div>
            <p><Icon name="location" size={14} /> {result.venue_zone}</p>
            <h2>{result.venue_name}</h2>
            <div className="search-result-rating" aria-label={result.reviewCount ? `${result.ratingAverage?.toFixed(1)} de 5, ${result.reviewCount} reseñas verificadas` : "Complejo nuevo, sin reseñas"}>
              {result.reviewCount ? <><span>★ {result.ratingAverage?.toFixed(1)}</span><small>({result.reviewCount})</small></> : <span>Nuevo · sin reseñas</span>}
            </div>
          </div>
          {result.distance_km !== null ? <span className="distance-chip">{result.distance_km} km</span> : null}
        </div>
        <p className="search-result-court">{result.court_name} · {result.modality_name}</p>
        <div className="search-result-amenities" aria-label="Características">
          {amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}
        </div>
        <div className="search-result-slot">
          <div>
            <span>Coincidencia disponible</span>
            <strong>{formatTime(result.start_time)} · 1 hora</strong>
          </div>
          <div className="search-result-price"><span>Precio por hora</span><strong>Bs {Number(result.price_bob).toFixed(0)}</strong></div>
        </div>
        {result.nextSlots.length ? (
          <div className="search-result-quick-times">
            <p>Próximos horarios para reservar</p>
            <div>
              {result.nextSlots.map((slot) => (
                <Link aria-label={`Reservar ${formatTime(slot.startTime)} por Bs ${slot.priceBob.toFixed(0)}`} href={reservationHref(slot)} key={`${slot.slotDate}-${slot.startTime}`}>
                  <strong>{formatTime(slot.startTime)}</strong>
                  <span>Bs {slot.priceBob.toFixed(0)}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <div className="search-result-actions">
          <Link className="button button--secondary" href={`/complejos/${result.venue_slug}`}>Ver complejo</Link>
          <Link className="button button--primary" href={`/complejos/${result.venue_slug}?${detailParams.toString()}#disponibilidad`}>Ver horarios <Icon name="calendar" size={17} /></Link>
        </div>
      </div>
    </article>
  );
}
