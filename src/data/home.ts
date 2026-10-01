export type Sport = "Fútbol" | "Pádel" | "Wally";

export type VenueCardData = {
  name: string;
  court: string;
  sport: Sport;
  area: string;
  rating: number | null;
  reviews: number;
  price: number;
  time: string;
  image: string;
  imageAlt: string;
  amenities: string[];
  badge?: string;
};

export const sports: Array<{ name: Sport; detail: string }> = [
  { name: "Fútbol", detail: "5, 7 y futsal" },
  { name: "Pádel", detail: "Singles y dobles" },
  { name: "Wally", detail: "Canchas indoor" },
];

export const areas = ["Equipetrol", "Urubó", "Norte", "Centro", "Plan 3000"];

export const homeSections: Array<{
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  venues: VenueCardData[];
}> = [
  {
    id: "cerca",
    eyebrow: "Para jugar hoy",
    title: "Cerca de ti",
    description: "Opciones destacadas en distintas zonas de Santa Cruz.",
    venues: [
      {
        name: "Arena Norte",
        court: "Cancha Central · Fútbol 7",
        sport: "Fútbol",
        area: "Norte",
        rating: 4.9,
        reviews: 86,
        price: 220,
        time: "20:00",
        image: "/images/venue-football.png",
        imageAlt: "Cancha de fútbol sintético iluminada al atardecer",
        amenities: ["Iluminación", "Parqueo"],
        badge: "Disponible hoy",
      },
      {
        name: "Punto Padel",
        court: "Cancha Azul · Dobles",
        sport: "Pádel",
        area: "Equipetrol",
        rating: 4.8,
        reviews: 64,
        price: 180,
        time: "19:30",
        image: "/images/venue-padel.png",
        imageAlt: "Cancha moderna de pádel azul entre jardines tropicales",
        amenities: ["Duchas", "Bebidas"],
        badge: "Disponible hoy",
      },
      {
        name: "Muro 360",
        court: "Cancha 2 · Wally",
        sport: "Wally",
        area: "Centro",
        rating: 4.7,
        reviews: 41,
        price: 140,
        time: "21:00",
        image: "/images/venue-wally.png",
        imageAlt: "Cancha interior luminosa de wally",
        amenities: ["Indoor", "Vestidores"],
        badge: "Último horario",
      },
    ],
  },
  {
    id: "valoradas",
    eyebrow: "Elegidas por jugadores",
    title: "Mejor valoradas",
    description: "Una vista previa de cómo se mostrarán las reseñas verificadas.",
    venues: [
      {
        name: "Distrito Padel",
        court: "Cancha Panorama · Dobles",
        sport: "Pádel",
        area: "Urubó",
        rating: 4.9,
        reviews: 112,
        price: 210,
        time: "18:00",
        image: "/images/venue-padel.png",
        imageAlt: "Cancha premium de pádel con lounge",
        amenities: ["Parqueo", "Cafetería"],
      },
      {
        name: "Cancha 24",
        court: "Cancha 1 · Fútbol 5",
        sport: "Fútbol",
        area: "Plan 3000",
        rating: 4.8,
        reviews: 73,
        price: 160,
        time: "22:00",
        image: "/images/venue-football.png",
        imageAlt: "Complejo de fútbol con césped sintético",
        amenities: ["Iluminación", "Baños"],
      },
    ],
  },
  {
    id: "reservadas",
    eyebrow: "Favoritas de la ciudad",
    title: "Más reservadas",
    description: "Ordenadas por actividad real cuando el motor de reservas esté activo.",
    venues: [
      {
        name: "Arena Norte",
        court: "Cancha Central · Fútbol 7",
        sport: "Fútbol",
        area: "Norte",
        rating: 4.9,
        reviews: 86,
        price: 220,
        time: "20:00",
        image: "/images/venue-football.png",
        imageAlt: "Cancha de fútbol sintético iluminada al atardecer",
        amenities: ["Parqueo", "Graderías"],
      },
      {
        name: "Muro 360",
        court: "Cancha 2 · Wally",
        sport: "Wally",
        area: "Centro",
        rating: 4.7,
        reviews: 41,
        price: 140,
        time: "21:00",
        image: "/images/venue-wally.png",
        imageAlt: "Cancha interior luminosa de wally",
        amenities: ["Indoor", "Vestidores"],
      },
    ],
  },
  {
    id: "nuevos",
    eyebrow: "Recién llegados",
    title: "Nuevos complejos",
    description: "Espacios que acaban de incorporarse a la experiencia CANCHEA.",
    venues: [
      {
        name: "Base Sports Club",
        court: "Cancha Lima · Pádel",
        sport: "Pádel",
        area: "Equipetrol",
        rating: null,
        reviews: 0,
        price: 190,
        time: "19:00",
        image: "/images/venue-padel.png",
        imageAlt: "Cancha azul de pádel rodeada por vegetación",
        amenities: ["Nuevo", "Duchas"],
        badge: "Nuevo",
      },
      {
        name: "La Red Indoor",
        court: "Cancha 1 · Wally",
        sport: "Wally",
        area: "Norte",
        rating: null,
        reviews: 0,
        price: 130,
        time: "20:30",
        image: "/images/venue-wally.png",
        imageAlt: "Cancha indoor de wally con iluminación uniforme",
        amenities: ["Nuevo", "Indoor"],
        badge: "Nuevo",
      },
    ],
  },
];
