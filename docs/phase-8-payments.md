# Fase 8 — Pagos y ledger

## Implementado

- Abstracción `PaymentProvider` en servidor y proveedor `mock` para desarrollo.
- Órdenes de pago idempotentes vinculadas a una reserva.
- Checkout de prueba en `/reservar/[id]`, sin movimiento de dinero real.
- Endpoint `POST /api/payments/webhooks/[provider]` con validación HMAC sobre el cuerpo crudo.
- Confirmación de reserva exclusivamente después de un evento de pago válido.
- Estados independientes para reserva, pago, orden de pago y liquidación.
- Bandeja auditable de eventos webhook con deduplicación por proveedor e identificador.
- Ledger de doble partida para el cobro de la seña.
- Campos `checkout_url`, `qr_payload` y metadatos preparados para integrar QR boliviano.

## Flujo Mock

1. El jugador crea un hold de cinco minutos.
2. `create_my_mock_payment_order(...)` valida identidad, rol, propiedad y vigencia del hold.
3. Se crea una orden por el snapshot de la seña, actualmente Bs 50.
4. En desarrollo, el jugador pulsa **Simular pago aprobado**.
5. El evento entra por el mismo procesador idempotente usado por el webhook.
6. PostgreSQL bloquea orden y reserva, valida importe, moneda y vigencia.
7. La orden pasa a `paid`, la reserva a `confirmed` y se escriben los asientos.

El QR mostrado es sólo un marcador visual con la leyenda `NO_PAGAR`; no representa un QR bancario ni una solicitud real.

## Seguridad del webhook

- La ruta compara `x-canchea-signature` con un HMAC SHA-256 usando comparación de tiempo constante.
- El secreto `CANCHEA_MOCK_WEBHOOK_SECRET` y `SUPABASE_SECRET_KEY` son variables exclusivas del servidor.
- La función `process_payment_webhook(...)` no está concedida a `anon` ni `authenticated`; sólo a `service_role`.
- El navegador nunca decide que un pago está confirmado ni envía el importe usado por la simulación autenticada.
- Cada evento se procesa una sola vez mediante `unique(provider, provider_event_id)`.
- Una entrega repetida no duplica órdenes, reservas confirmadas ni asientos.

## Ledger

La confirmación devenga la comisión completa de la reserva y registra el efectivo realmente cobrado:

- débito a `platform_cash` por la seña;
- crédito a `platform_commission_revenue` por la comisión devengada;
- crédito a `venue_payable` por la parte de la seña perteneciente al complejo;
- débito a `commission_receivable` cuando la comisión supera la seña cobrada.

Antes de terminar la transacción se verifica que la suma de débitos sea igual a la suma de créditos. El saldo que el jugador paga directamente en el complejo continúa separado en `remaining_balance_bob`.

## Pruebas realizadas

- Reserva de prueba confirmada con seña Bs 50 mediante proveedor Mock.
- Orden `pending → paid` y reserva `pending_payment → confirmed`.
- Historial con motivo `payment_confirmed`.
- Ledger comprobado con Bs 50 en débitos y Bs 50 en créditos.
- Caso real de prueba: comisión Bs 18 y obligación al complejo Bs 32.
- Evento repetido: primera entrega adicional ignorada, segunda marcada duplicada y un solo movimiento contable.
- Webhook con Bs 49 contra una orden de Bs 50: `AMOUNT_OR_CURRENCY_MISMATCH`, cero asientos y reserva sin confirmar.
- Usuario `authenticated` sin permiso para invocar el RPC reservado al webhook.
- Endpoint local sin secretos configurados: cierre seguro con HTTP 503.
- Liberación de una orden pendiente: reserva `expired`, pago `failed` y orden `cancelled`.
- `npm run lint`, `npm run typecheck` y `npm run build`.

## Configuración

```text
SUPABASE_SECRET_KEY=
CANCHEA_MOCK_WEBHOOK_SECRET=
```

`mock_payments_enabled` está activo para desarrollo. Debe ponerse en `false` antes de habilitar cobros reales o publicar un entorno productivo.

## Decisiones técnicas

- Las llamadas externas futuras ocurrirán fuera de la transacción de base de datos; el webhook mantiene una transacción corta para confirmar y contabilizar.
- `provider` es texto validado, no enum, para agregar proveedores sin migrar el tipo.
- Se permiten varios intentos fallidos por reserva, pero sólo una orden pendiente y un cobro exitoso.
- El ledger conserva los conceptos financieros; los KPIs futuros no inferirán utilidad desde el estado de la reserva.
- No se almacenan tarjetas, credenciales bancarias ni datos sensibles de pago.

## Dependencias externas pendientes

- Elegir y aprobar un proveedor real compatible con Bolivia.
- Implementar el adaptador real, sus credenciales, sandbox y firma oficial.
- Desactivar el Mock en producción.

Las cancelaciones, reembolsos y liquidaciones ya están implementadas en las fases 9 a 14.
