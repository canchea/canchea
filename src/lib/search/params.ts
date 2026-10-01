import { dateInTimeZone } from "@/lib/courts/time";

export const SEARCH_PAGE_SIZE = 12;
export const SEARCH_TIMEZONE = "America/La_Paz";

export type SearchSort =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "distance"
  | "rating"
  | "popularity"
  | "newest";

export type SearchFilters = {
  sport: string;
  zone: string;
  date: string;
  time: string;
  minPrice: number | null;
  maxPrice: number | null;
  duration: 30 | 60 | null;
  sort: SearchSort;
  latitude: number | null;
  longitude: number | null;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function numberInRange(value: string, min: number, max: number) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSearchParams(raw: RawSearchParams): SearchFilters {
  const today = dateInTimeZone(SEARCH_TIMEZONE);
  const rawDate = first(raw.fecha);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= today ? rawDate : today;
  const rawTime = first(raw.hora);
  const time = /^(?:[01]\d|2[0-3]):(?:00|30)$/.test(rawTime) ? rawTime : "";
  const durationValue = Number(first(raw.duracion));
  const duration = durationValue === 30 || durationValue === 60 ? durationValue : null;
  const minPrice = numberInRange(first(raw.precio_min), 0, 100000);
  const maxPrice = numberInRange(first(raw.precio_max), 0, 100000);
  const latitude = numberInRange(first(raw.lat), -90, 90);
  const longitude = numberInRange(first(raw.lng), -180, 180);
  const hasCoordinates = latitude !== null && longitude !== null;
  const requestedSort = first(raw.orden);
  const allowedSorts: SearchSort[] = ["recommended", "price_asc", "price_desc", "distance", "rating", "popularity", "newest"];
  let sort = allowedSorts.includes(requestedSort as SearchSort)
    ? requestedSort as SearchSort
    : "recommended";
  if (sort === "distance" && !hasCoordinates) sort = "recommended";
  const requestedPage = Math.floor(numberInRange(first(raw.pagina), 1, 1000) ?? 1);

  return {
    sport: slugify(first(raw.deporte)),
    zone: first(raw.zona).trim().slice(0, 100),
    date,
    time,
    minPrice,
    maxPrice: minPrice !== null && maxPrice !== null && maxPrice < minPrice ? null : maxPrice,
    duration,
    sort,
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    page: requestedPage,
  };
}

export function filtersToSearchParams(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.sport) params.set("deporte", filters.sport);
  if (filters.zone) params.set("zona", filters.zone);
  params.set("fecha", filters.date);
  if (filters.time) params.set("hora", filters.time);
  if (filters.minPrice !== null) params.set("precio_min", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("precio_max", String(filters.maxPrice));
  if (filters.duration !== null) params.set("duracion", String(filters.duration));
  if (filters.sort !== "recommended") params.set("orden", filters.sort);
  if (filters.latitude !== null && filters.longitude !== null) {
    params.set("lat", String(filters.latitude));
    params.set("lng", String(filters.longitude));
  }
  if (filters.page > 1) params.set("pagina", String(filters.page));
  return params;
}
