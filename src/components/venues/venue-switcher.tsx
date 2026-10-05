import Link from "next/link";
import { selectOwnerVenueAction } from "@/app/propietario/actions";
import { venueStatusLabels } from "@/lib/venues/status";
import type { VenueStatus } from "@/types/database";

type SwitcherVenue = { id: string; commercial_name: string; zone: string; status: VenueStatus };

export function VenueSwitcher({
  venues,
  activeVenueId,
  returnTo,
}: {
  venues: SwitcherVenue[];
  activeVenueId: string;
  returnTo: string;
}) {
  if (!venues.length) return null;

  return (
    <section aria-label="Sucursal activa" className="venue-switcher">
      {venues.length > 1 ? (
        <form action={selectOwnerVenueAction} className="venue-switcher-form">
          <input name="return_to" type="hidden" value={returnTo} />
          <div className="form-field">
            <label htmlFor="venue-switcher">Sucursal</label>
            <select defaultValue={activeVenueId} id="venue-switcher" name="venue_id">
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.commercial_name} · {venue.zone} ({venueStatusLabels[venue.status]})
                </option>
              ))}
            </select>
          </div>
          <button className="button button--dark" type="submit">Cambiar</button>
        </form>
      ) : (
        <p><span>Sucursal</span><strong>{venues[0].commercial_name} · {venues[0].zone}</strong></p>
      )}
      <Link className="button" href="/propietario?nueva=1">Agregar sucursal</Link>
    </section>
  );
}
