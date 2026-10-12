import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { SearchResultWithImage } from "@/components/search/search-result-card";

function formatTime(value: string) {
  return value.slice(0, 5);
}

export function PlayerDiscoveryCard({
  result,
  badge,
  availabilityLabel,
  eager = false,
}: {
  result: SearchResultWithImage;
  badge: string;
  availabilityLabel: string;
  eager?: boolean;
}) {
  const slot = result.nextSlots[0];
  const reservationHref = slot
    ? `/reservar?${new URLSearchParams({
        cancha: result.court_id,
        fecha: slot.slotDate,
        hora: formatTime(slot.startTime),
        duracion: "60",
      }).toString()}`
    : `/complejos/${result.venue_slug}`;

  return (
    <article className="venue-card player-discovery-card">
      <Link className="venue-image-wrap player-discovery-media" href={`/complejos/${result.venue_slug}`}>
        {result.signedCoverUrl ? (
          <Image
            alt={result.cover_alt_text ?? `Cancha ${result.court_name}`}
            className="venue-image"
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(max-width: 720px) 83vw, (max-width: 1100px) 44vw, 31vw"
            src={result.signedCoverUrl}
            unoptimized
          />
        ) : (
          <span className="player-discovery-placeholder">CANCHEA</span>
        )}
        <span className="venue-badge">{badge}</span>
        <span className="sport-pill">{result.sport_name}</span>
      </Link>
      <div className="venue-body">
        <div className="venue-title-row">
          <div>
            <p className="venue-area"><Icon name="location" size={15} /> {result.venue_zone}</p>
            <h3>{result.venue_name}</h3>
          </div>
          <div className="rating" aria-label={result.reviewCount ? `${result.ratingAverage?.toFixed(1)} de 5, ${result.reviewCount} reseñas verificadas` : "Complejo nuevo, sin reseñas"}>
            <Icon name="star" size={15} />
            <strong>{result.reviewCount ? result.ratingAverage?.toFixed(1) : "Nuevo"}</strong>
            {result.reviewCount ? <small>({result.reviewCount})</small> : null}
          </div>
        </div>
        <p className="court-name">{result.court_name} · {result.modality_name}</p>
        <div className="amenity-list" aria-label="Características de la reserva">
          <span>Reserva en línea</span>
          <span>Bloques de 1 hora</span>
        </div>
        <div className="venue-footer">
          <div>
            <span className="price-label">Desde</span>
            <strong>Bs {slot ? slot.priceBob.toFixed(0) : Number(result.price_bob).toFixed(0)}</strong>
            <span className="price-unit"> / hora</span>
          </div>
          <Link className="slot-button" href={reservationHref}>
            {slot ? `${availabilityLabel} · ${formatTime(slot.startTime)}` : "Ver complejo"}
            <Icon name="chevron" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
