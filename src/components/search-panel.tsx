import { Icon } from "@/components/ui/icon";
import { getSearchOptions } from "@/lib/search/data";
import { dateInTimeZone } from "@/lib/courts/time";
import type { SearchFilters } from "@/lib/search/params";

type SearchPanelProps = {
  defaults?: Partial<SearchFilters>;
  showAdvanced?: boolean;
};

export async function SearchPanel({ defaults, showAdvanced = false }: SearchPanelProps = {}) {
  const { sports, zones } = await getSearchOptions();
  const selectedSport = defaults?.sport ?? "futbol";
  const selectedZone = defaults?.zone ?? "Equipetrol";
  const selectedDate = defaults?.date ?? dateInTimeZone("America/La_Paz");

  return (
    <form className={showAdvanced ? "search-panel search-panel--advanced" : "search-panel"} action="/buscar" method="get" aria-label="Buscar una cancha">
      <div className="search-fields">
        <label className="search-field">
          <span className="field-icon"><Icon name="whistle" /></span>
          <span className="field-copy">
            <span className="field-label">Deporte</span>
            <select name="deporte" defaultValue={selectedSport}>
              <option value="">Todos</option>
              {sports.map((sport) => <option key={sport.slug} value={sport.slug}>{sport.name}</option>)}
            </select>
          </span>
        </label>
        <label className="search-field">
          <span className="field-icon"><Icon name="location" /></span>
          <span className="field-copy">
            <span className="field-label">Zona</span>
            <select name="zona" defaultValue={selectedZone}>
              <option value="">Cualquier zona</option>
              {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </span>
        </label>
        <label className="search-field">
          <span className="field-icon"><Icon name="calendar" /></span>
          <span className="field-copy">
            <span className="field-label">Fecha</span>
            <input aria-label="Fecha de la reserva" defaultValue={selectedDate} min={dateInTimeZone("America/La_Paz")} name="fecha" type="date" />
          </span>
        </label>
        <label className="search-field">
          <span className="field-icon"><Icon name="clock" /></span>
          <span className="field-copy">
            <span className="field-label">Hora</span>
            <input aria-label="Hora de la reserva" defaultValue={defaults?.time ?? "20:00"} name="hora" step="1800" type="time" />
          </span>
        </label>
      </div>
      {showAdvanced ? (
        <div className="search-advanced-fields">
          <label>
            <span>Precio mínimo</span>
            <input defaultValue={defaults?.minPrice ?? ""} min="0" name="precio_min" placeholder="Bs 0" step="10" type="number" />
          </label>
          <label>
            <span>Precio máximo</span>
            <input defaultValue={defaults?.maxPrice ?? ""} min="0" name="precio_max" placeholder="Sin límite" step="10" type="number" />
          </label>
          <label>
            <span>Duración</span>
            <select defaultValue={defaults?.duration ?? ""} name="duracion">
              <option value="">Cualquier duración</option>
              <option value="30">30 minutos</option>
              <option value="60">60 minutos</option>
            </select>
          </label>
          <label>
            <span>Ordenar</span>
            <select defaultValue={defaults?.sort ?? "recommended"} name="orden">
              <option value="recommended">Recomendados</option>
              <option value="price_asc">Precio: menor primero</option>
              <option value="price_desc">Precio: mayor primero</option>
              <option value="newest">Complejos nuevos</option>
              <option value="rating">Mejor valoración</option>
              <option value="popularity">Más reservados</option>
            </select>
          </label>
          {defaults?.latitude !== null && defaults?.latitude !== undefined && defaults.longitude !== null && defaults.longitude !== undefined ? (
            <>
              <input name="lat" type="hidden" value={defaults.latitude} />
              <input name="lng" type="hidden" value={defaults.longitude} />
            </>
          ) : null}
        </div>
      ) : null}
      <button className="button button--primary search-submit" type="submit"><Icon name="search" />Buscar cancha</button>
    </form>
  );
}
