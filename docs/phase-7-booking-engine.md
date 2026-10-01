# Fase 7 — Motor de reservas

## Implementado

- Checkout de revisión en `/reservar` para cuentas `player`.
- Creación atómica de un hold de cinco minutos al confirmar la selección.
- Página de checkout `/reservar/[id]` con contador, código público, importes y estado.
- Código público no secuencial con formato `CAN-XXXXXX`; el UUID permanece como identificador interno.
- Estados `pending_payment`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `expired` y `refunded_partial`.
- Historial append-only de cada cambio de estado, con actor, motivo, metadatos y fecha.
- Liberación voluntaria del checkout y liberación efectiva al vencer el hold.
- Enlaces de reserva desde resultados de búsqueda y desde la cancha seleccionada.
- Retorno al checkout después del inicio de sesión mediante una ruta interna validada.
- Resumen básico de intentos de reserva en el área del jugador.

## Backend y concurrencia

La migración `20261001033730_phase_7_booking_engine.sql` incorpora las tablas `bookings` y `booking_status_history`, RLS, funciones RPC y una restricción de exclusión GiST.

`create_booking_hold(...)`:

1. autentica y exige rol `player`;
2. toma un advisory lock transaccional por cancha;
3. normaliza holds vencidos;
4. recalcula la disponibilidad y el precio en PostgreSQL;
5. inserta el hold y sus snapshots financieros dentro de la misma transacción.

La restricción `bookings_no_active_overlap` impide rangos solapados para estados que ocupan cancha. El frontend no puede insertar ni actualizar reservas directamente; sólo puede usar RPCs autorizadas.

`get_court_availability(...)` ahora excluye reservas confirmadas, en curso y holds todavía vigentes. Un hold vencido deja de ocultar el horario por tiempo de base de datos, incluso antes de que su estado se normalice de forma diferida a `expired`.

La migración `20261001035207_phase_7_booking_indexes.sql` añade el índice compuesto recomendado para la relación cancha/complejo.

## Snapshots financieros preparados

Aunque los pagos pertenecen a la Fase 8, cada reserva ya congela los valores configurados al iniciar el checkout:

- precio total;
- seña;
- porcentaje e importe de comisión;
- neto correspondiente al complejo;
- saldo pendiente del jugador.

Cambiar posteriormente la configuración global no altera reservas históricas.

## Pruebas realizadas

- Dos solicitudes simultáneas contra la misma cancha, fecha, hora y duración.
- Resultado: una aceptada y una rechazada con `SLOT_UNAVAILABLE`.
- El horario desapareció de disponibilidad durante el hold.
- El hold se creó con exactamente cinco minutos.
- Liberación voluntaria comprobada; el horario reapareció inmediatamente.
- Historial comprobado: `pending_payment → expired`.
- Formato de código público y snapshots de Bs 90, seña Bs 50 y comisión 10% verificados.
- RLS: tablas sin escritura directa para clientes; lectura limitada a jugador, propietario relacionado o superadministrador.
- Advisor de rendimiento sin claves foráneas sin índice.
- Navegación pública revisada en navegador y botones `Reservar` visibles, sin errores de consola.
- `npm run lint`, `npm run typecheck` y `npm run build`.

## Decisiones técnicas

- La combinación advisory lock + exclusión GiST cubre concurrencia y solapamientos a nivel de base de datos.
- Los rangos usan límites `[)` para permitir reservas consecutivas, por ejemplo 20:00–20:30 y 20:30–21:00.
- La expiración funcional depende del reloj de PostgreSQL, no del contador del navegador.
- La normalización del estado vencido es diferida al consultar el checkout o al intentar un nuevo hold; no requiere un cron en el plan gratuito.
- El historial se escribe mediante trigger para evitar cambios silenciosos.
- No se implementó confirmación de pago: el checkout muestra correctamente que esa acción pertenece a la Fase 8.

## Recomendaciones

- Mantener el hold en cinco minutos durante el piloto y medir abandonos antes de modificarlo.
- Activar la protección de contraseñas filtradas de Supabase antes del piloto.
- En Fase 8, confirmar reservas exclusivamente desde un webhook autenticado e idempotente.
- Añadir limpieza periódica de registros vencidos sólo cuando el volumen lo justifique; no es necesaria para liberar horarios.

## Pendiente

- `PaymentProvider` y `PAYMENT_PROVIDER_MOCK`.
- Órdenes de pago, webhook, estados de pago y ledger.
- Confirmación `pending_payment → confirmed` tras pago verificado.
- Cancelaciones y reembolsos en sus fases correspondientes.

## Siguiente fase

Fase 8 — pagos: abstracción de proveedor, mock, webhook seguro e idempotente, seña configurable, estados de pago, ledger y preparación para QR boliviano sin conectar un proveedor real todavía.
