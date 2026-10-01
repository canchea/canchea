export const playerNavigation = [
  { href: "/jugador", label: "Inicio" },
  { href: "/jugador/reservas", label: "Reservas" },
  { href: "/jugador/favoritos", label: "Favoritos" },
  { href: "/jugador/valoraciones", label: "Valoraciones" },
  { href: "/jugador/reclamos", label: "Reclamos" },
  { href: "/jugador/notificaciones", label: "Notificaciones" },
] as const;

export const ownerNavigation = [
  { href: "/propietario/dashboard", label: "Resumen" },
  { href: "/propietario/reservas", label: "Reservas" },
  { href: "/propietario/calendario", label: "Calendario" },
  { href: "/propietario", label: "Mi complejo" },
  { href: "/propietario/canchas", label: "Canchas" },
  { href: "/propietario/disponibilidad", label: "Disponibilidad" },
  { href: "/notificaciones", label: "Notificaciones" },
] as const;

export const adminNavigation = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/operaciones", label: "Operaciones" },
  { href: "/admin/configuracion", label: "Configuración" },
  { href: "/notificaciones", label: "Notificaciones" },
] as const;
