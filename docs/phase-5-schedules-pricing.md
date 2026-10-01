# Fase 5 — Horarios, precios y disponibilidad

## Alcance entregado

- Horario semanal independiente por cancha, en intervalos de 30 minutos.
- Validación contra el horario general del complejo.
- Reglas de precio por cancha, día, franja y duración de 30 o 60 minutos.
- Prevención de reglas de precio superpuestas para el mismo día y duración.
- Bloqueos manuales por mantenimiento, evento, uso interno u otro motivo.
- Prevención de bloqueos superpuestos.
- Disponibilidad calculada únicamente desde backend.
- Consulta de rango de hasta 31 días en una sola llamada para evitar resultados parciales por fallos de red.
- Exclusión automática de horarios bloqueados o sin precio.
- Anticipación mínima global de 60 minutos.
- Vista previa de los próximos siete días para el propietario.
- Precio mínimo y próximo horario de las siguientes 48 horas en la ficha pública.
- Sin reservas manuales en esta fase.

## Modelo de datos

La migración `20260930153141_phase_5_schedules_pricing.sql` agrega:

- `platform_settings`: parámetros globales auditables de operación.
- `court_weekly_schedules`: horario recurrente por día y cancha.
- `court_pricing_rules`: franjas y precios por duración.
- `court_blocks`: periodos no disponibles con motivo opcional.
- `venues.timezone`: zona horaria operativa del complejo.

La disponibilidad se obtiene mediante `get_court_availability(court_id, date)`. La función valida visibilidad, horario, precio, bloqueos y anticipación mínima antes de devolver un horario.

La interfaz consume `get_court_availability_range(court_id, start_date, days)`, que agrupa el cálculo diario dentro de PostgreSQL y devuelve una respuesta consistente.

## Seguridad

- RLS está activo en todas las tablas nuevas.
- El público sólo puede consultar horarios y precios de canchas activas en complejos aprobados.
- Los bloqueos sólo son visibles para el propietario correspondiente y el superadmin.
- Las mutaciones se realizan mediante funciones que vuelven a validar sesión, rol y propiedad.
- Las funciones `SECURITY DEFINER` usan `search_path` vacío y referencias calificadas.

## Pruebas realizadas

- Creación de horario semanal válido.
- Creación de precios de 30 y 60 minutos.
- Rechazo de reglas superpuestas.
- Generación de disponibilidad futura.
- Creación de un bloqueo y comprobación de que reduce los horarios disponibles.
- Verificación autenticada de siete días consecutivos: 9 horarios restantes en el día actual y 30 horarios en cada uno de los seis días siguientes para la cancha de prueba.
- Inicio de sesión y permisos comprobados para perfiles de propietario y jugador.
- Rollback total de los datos usados en la prueba transaccional.
- `npm run lint`.
- `npm run typecheck`.

## Decisiones de producto

- Moneda: bolivianos (BOB).
- Zona horaria inicial: `America/La_Paz`.
- Anticipación mínima: 1 hora.
- Se conservan en configuración los valores aprobados para fases posteriores: reserva mínima de Bs 50 y comisión de plataforma del 10 %.
