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
  eager = false,
}: {
  result: SearchResultWithImage;
  badge: string;
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
    <article className="player-discovery-card">
      <Link className="player-discovery-media" href={`/complejos/${result.venue_slug}`}>
        {result.signedCoverUrl ? (
          <Image
            alt={result.cover_alt_text ?? `Cancha ${result.court_name}`}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(max-width: 760px) 78vw, 310px"
            src={result.signedCoverUrl}
            unoptimized
          />
        ) : (
          <span className="player-discovery-placeholder">CANCHEA</span>
        )}
        <span className="player-discovery-badge">{badge}</span>
        <span className="player-discovery-sport">{result.sport_name}</span>
      </Link>
      <div className="player-discovery-body">
        <div className="player-discovery-title">
          <div>
            <span><Icon name="location" size={14} /> {result.venue_zone}</span>
            <h3>{result.venue_name}</h3>
          </div>
          <div className="player-discovery-rating" aria-label={result.reviewCount ? `${result.ratingAverage?.toFixed(1)} de 5, ${result.reviewCount} reseñas verificadas` : "Complejo nuevo, sin reseñas"}>
            <Icon name="star" size={14} />
            <strong>{result.reviewCount ? result.ratingAverage?.toFixed(1) : "Nuevo"}</strong>
          </div>
        </div>
        <p>{result.court_name} · {result.modality_name}</p>
        <div className="player-discovery-action">
          <div>
            <span>{slot ? "Disponible hoy" : "Precio por hora"}</span>
            <strong>{slot ? formatTime(slot.startTime) : `Bs ${Number(result.price_bob).toFixed(0)}`}</strong>
          </div>
          <Link href={reservationHref}>
            {slot ? `Reservar · Bs ${slot.priceBob.toFixed(0)}` : "Ver complejo"}
          </Link>
        </div>
      </div>
    </article>
  );
}
