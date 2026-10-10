export const playerNavigation = [
  { href: "/jugador", label: "Reservar" },
  { href: "/jugador/reservas", label: "Reservas" },
  { href: "/jugador/favoritos", label: "Favoritos" },
  { href: "/jugador/valoraciones", label: "Valoraciones" },
  { href: "/jugador/reclamos", label: "Reclamos" },
  { href: "/jugador/notificaciones", label: "Notificaciones" },
] as const;

export const ownerNavigation = [
  { href: "/propietario/dashboard", label: "Inicio" },
  { href: "/propietario/calendario", label: "Calendario" },
  { href: "/propietario/reservas", label: "Reservas" },
  { href: "/propietario/canchas", label: "Canchas" },
  { href: "/propietario", label: "Configuración" },
] as const;

export const adminNavigation = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/operaciones", label: "Operaciones" },
  { href: "/admin/configuracion", label: "Configuración" },
  { href: "/notificaciones", label: "Notificaciones" },
] as const;
