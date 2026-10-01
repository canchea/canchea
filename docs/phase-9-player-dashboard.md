# Fase 9 — Panel del jugador

## Implementado

- Resumen de próximas reservas, gasto reservado y actividad reciente.
- Historial completo con estados, importes, reembolsos y penalizaciones.
- Cancelación autenticada mediante RPC transaccional.
- Política escalonada configurable: con 6 horas o más se devuelven Bs 30 y se retienen Bs 20; con menos de 6 horas o no-show se retiene la seña completa de Bs 50.
- Reparto configurable de la penalización; valor inicial 50% complejo y 50% CANCHEA.
- Enlace para agregar una reserva confirmada a Google Calendar.
- Atajos a favoritos, valoraciones, reclamos y notificaciones.

La cancelación nunca borra asientos. Registra movimientos compensatorios, crea el reembolso cuando corresponde y conserva la trazabilidad.
