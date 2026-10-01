# Fase 15 — QA y endurecimiento

## Verificaciones realizadas

- `npm run typecheck`, `npm run lint` y `npm run build` exitosos.
- 31 rutas compiladas, incluidas áreas de jugador, propietario y administrador.
- RLS habilitado en las once tablas nuevas de operación y confianza.
- Políticas de perfiles consolidadas para jugador, propietario y super admin.
- Índices de claves foráneas revisados con Supabase Advisors.
- Ledger verificado después de reservas, cancelaciones, no-show y una liquidación real de prueba: 9 transacciones, Bs 330 en débitos, Bs 330 en créditos y 0 transacciones desbalanceadas.
- Cancelación temprana real: devolución Bs 30, penalización Bs 20 y reparto Bs 10/Bs 10.
- Cancelación tardía real: devolución Bs 0, penalización Bs 50 y saldo final Bs 25 para el complejo / Bs 25 para CANCHEA.
- No-show real marcado por el propietario con penalización completa y sin reembolso.
- Reembolso procesado y auditado.
- Liquidación de prueba creada por Bs 10 y reserva marcada como liquidada.
- Ranking por valoración ejecutado contra disponibilidad real.
- Favorito de complejo y cancha creado con la cuenta de jugador de prueba.
- Reclamo creado por el jugador y resuelto por el super admin, con notificaciones y auditoría.
- Recordatorio `canchea-booking-reminders` activo cada 15 minutos.
- Revisión visual pública de búsqueda y complejos en navegador.
- SEO técnico público: canonical por página, Open Graph/Twitter, `robots.txt`, sitemap dinámico con complejos aprobados y JSON-LD `SportsActivityLocation` sin inventar valoraciones.
- Recuperación de interfaz: límites de error local/global y página 404 con acciones claras.

## Advertencias aceptadas

- Los RPC `SECURITY DEFINER` expuestos están diseñados como comandos de dominio y validan identidad, rol, propiedad y parámetros dentro de la transacción. El linter los reporta de manera genérica.
- `get_court_availability` es público deliberadamente para permitir búsqueda anónima y sólo devuelve disponibilidad comercial.
- La protección de contraseñas filtradas debe habilitarse manualmente en Supabase Auth antes de producción.
- Los índices recién creados aparecen inicialmente como no utilizados porque todavía no existe carga de piloto suficiente.
