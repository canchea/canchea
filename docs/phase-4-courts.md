# Fase 4 — Canchas

## Alcance entregado

- Catálogos extensibles para deportes, modalidades, superficies y características.
- Deportes iniciales: Fútbol, Pádel y Wally.
- Modalidades iniciales por deporte, sin limitar la arquitectura a esas opciones.
- Registro y edición de canchas por propietarios de complejos aprobados.
- Nombre, capacidad, dimensiones, superficie, techado, iluminación y características adicionales.
- Duraciones habilitadas de 30 y/o 60 minutos.
- Portada y galería privada en el bucket `venue-media`.
- Estados `draft`, `active` e `inactive`.
- Visualización pública únicamente para canchas activas de complejos aprobados.
- Contadores de canchas en el panel del super admin.

## Reglas operativas

1. Un propietario sólo puede crear o editar canchas si su complejo está aprobado.
2. Una cancha se crea como borrador.
3. Para activarla necesita al menos una duración y una foto de portada.
4. Una cancha pausada deja de ser visible públicamente, pero conserva su configuración.
5. Los horarios y precios no forman parte de esta fase; se implementarán en la Fase 5.

## Seguridad

- Todas las tablas expuestas tienen RLS habilitado.
- Los catálogos activos son públicos; los registros inactivos sólo son visibles al super admin.
- El público sólo puede leer canchas activas vinculadas a complejos aprobados.
- Los propietarios pueden leer sus propias canchas en cualquier estado.
- Las escrituras pasan por funciones autenticadas que verifican sesión, rol y propiedad.
- Las fotos usan rutas `venue_id/courts/court_id/{cover|gallery}/archivo` y políticas específicas de Storage.
- No se usa `user_metadata` para autorizar roles.

## Migraciones

- `20260930142916_phase_4_courts.sql`: catálogos, canchas, fotos, RLS, Storage y funciones operativas.
- `20260930145740_phase_4_court_performance.sql`: índice compuesto para la relación modalidad/deporte.

## Verificación realizada

- Prueba transaccional con rollback: crear cancha, persistir duraciones y características, rechazar activación sin portada, registrar portada y activar.
- `npm run typecheck`.
- `npm run lint`.
- Revisión visual del panel administrativo.
- Supabase Security Advisor y Performance Advisor después de aplicar las migraciones.

Las advertencias de funciones `SECURITY DEFINER` son intencionales: son la API transaccional de escritura para usuarios autenticados y cada función vuelve a comprobar rol y propiedad. La protección de contraseñas filtradas sigue siendo una opción de Auth pendiente de habilitar en la configuración del proyecto.
