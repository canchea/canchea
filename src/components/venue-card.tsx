import Image from "next/image";
import type { VenueCardData } from "@/data/home";
import { Icon } from "@/components/ui/icon";

export function VenueCard({ venue }: { venue: VenueCardData }) {
  return (
    <article className="venue-card">
      <div className="venue-image-wrap">
        <Image alt={venue.imageAlt} className="venue-image" fill sizes="(max-width: 720px) 82vw, (max-width: 1100px) 44vw, 31vw" src={venue.image} />
        {venue.badge ? <span className="venue-badge">{venue.badge}</span> : null}
        <span className="sport-pill">{venue.sport}</span>
      </div>
      <div className="venue-body">
        <div className="venue-title-row">
          <div><p className="venue-area"><Icon name="location" size={15} /> {venue.area}</p><h3>{venue.name}</h3></div>
          <div className="rating" aria-label={venue.rating ? `${venue.rating} de 5, ${venue.reviews} reseñas` : "Nuevo, sin reseñas todavía"}><Icon name="star" size={15} /><span>{venue.rating ?? "Nuevo"}</span>{venue.rating ? <small>({venue.reviews})</small> : null}</div>
        </div>
        <p className="court-name">{venue.court}</p>
        <div className="amenity-list" aria-label="Servicios">{venue.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
        <div className="venue-footer">
          <div><span className="price-label">Desde</span><strong>Bs {venue.price}</strong><span className="price-unit"> / hora</span></div>
          <span className="slot-button" aria-label={`Horario demostrativo: ${venue.time}`}>{venue.time}<Icon name="chevron" size={16} /></span>
        </div>
      </div>
    </article>
  );
}
