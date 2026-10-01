# Fase 3 — Complejos deportivos

## Alcance implementado

- Registro y edición de un complejo por cuenta `venue_owner`.
- Identidad comercial, descripción, teléfonos, dirección, zona, ciudad y coordenadas.
- Catálogo extensible de servicios.
- Horario general semanal.
- Logo, portada y hasta 10 imágenes de galería en Supabase Storage.
- Flujo `draft` → `pending_approval` → `approved`, `rejected` o `changes_requested`.
- Historial auditable de cada cambio de estado.
- Cola de revisión exclusiva para `super_admin`.
- Listado y ficha pública únicamente para complejos aprobados.

## Decisiones de producto y seguridad

- En el MVP cada propietario administra un complejo. La relación se puede ampliar sin cambiar las tablas dependientes.
- Un complejo pendiente o aprobado queda bloqueado para edición. Esto evita publicar cambios no revisados. Los complejos rechazados o con cambios solicitados vuelven a ser editables.
- Para enviar a revisión se requieren datos completos, al menos un servicio, un día abierto, logo y portada.
- Las coordenadas se almacenan sin acoplar la aplicación a un proveedor de mapas. La ficha pública ofrece solamente un enlace externo.
- El bucket `venue-media` es privado. Sus objetos se sirven con URL firmada y RLS: propietario y admin pueden ver los propios; visitantes solo ven archivos vinculados a un complejo aprobado.
- Las mutaciones sensibles usan RPC transaccionales que validan `auth.uid()`, rol, propiedad y transición de estado.
- Las tablas expuestas tienen RLS y permisos mínimos; no hay escrituras directas de `anon` o `authenticated` sobre el modelo de complejos.

## Modelo de datos

- `venues`
- `services`
- `venue_services`
- `venue_opening_hours`
- `venue_photos`
- `venue_status_history`

Las migraciones aplicadas son:

- `phase_3_venues`
- `phase_3_public_rls_fix`
- `phase_3_rls_performance`

## Rutas

- `/propietario`: alta, edición, imágenes, estado e historial.
- `/admin`: cola de revisión y decisiones de `super_admin`.
- `/complejos`: catálogo público de aprobados.
- `/complejos/[slug]`: ficha pública del complejo aprobado.

## Verificación realizada

- Prueba transaccional en el proyecto remoto: crea propietario y admin temporales, registra un complejo, agrega logo y portada, envía, aprueba, valida lectura anónima y ejecuta `rollback`.
- RLS público separado de las reglas autenticadas para impedir acceso a borradores.
- Índices presentes para las claves foráneas detectadas por el asesor de rendimiento.
- `npm run lint`, `npm run typecheck` y `npm run build` terminan correctamente.
- Revisión visual en escritorio y móvil del catálogo público.
- Consola del navegador sin errores ni advertencias.

## Avisos conocidos del asesor de Supabase

- Los seis RPC públicos aparecen como `SECURITY DEFINER` ejecutables por usuarios autenticados. Es intencional: cada función valida sesión, rol, propiedad y estado, tiene `search_path` vacío y revoca acceso a `anon`.
- La protección contra contraseñas filtradas permanece deshabilitada en Auth. Debe habilitarse cuando la opción esté disponible en el plan/configuración del proyecto.
- Los índices nuevos aparecen como no utilizados porque todavía no hay tráfico real; deben conservarse para las consultas y las claves foráneas previstas.
