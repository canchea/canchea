# Pagos y lanzamiento de CANCHEA

## Decisión recomendada para pagos

Para el piloto boliviano se recomienda **Circle** como primera opción comercial:

- acepta QR y tarjetas;
- publica una comisión de 3% + Bs 1 por venta;
- no publica cobro de afiliación, mensualidad ni anualidad;
- entrega la documentación de su API dentro del área de clientes.

La integración real queda deliberadamente bloqueada hasta recibir del proveedor:

1. credenciales de sandbox y producción;
2. contrato vigente y calendario de liquidación;
3. documentación exacta de creación de orden, firma de webhook, consulta y devolución;
4. URLs/IPs de origen y política de reintentos;
5. confirmación de que admite marketplace con reparto CANCHEA/proveedor o, en su defecto, el flujo contable de liquidación posterior.

No se deben inventar endpoints ni validar callbacks únicamente por un identificador en URL. El webhook debe verificarse criptográficamente y procesarse con la bandeja idempotente ya implementada en `payment_webhook_events`.

Libélula queda como alternativa empresarial por su REST API, QR, tarjetas y facturación integrada. Se debe cotizar antes de decidir porque su tarifa no está publicada de forma completa.

## Estado técnico

- Pago mock completo y aislado para pruebas.
- Holds, expiración, idempotencia, auditoría de webhooks y mayor contable completos.
- Política de seña y comisión CANCHEA 10% parametrizadas. La seña es el mayor entre el monto base (Bs 50) y la comisión, sin superar el precio del horario: la comisión siempre queda cubierta por la seña y CANCHEA nunca debe cobrar saldos al complejo. En cancelaciones tempranas la penalidad se mantiene fija y se devuelve el resto de la seña.
- Un propietario puede administrar varias sucursales; cada una tiene su ficha, canchas, horarios, revisión, prueba de 3 meses y liquidación propias.
- Cancelaciones, reembolsos y liquidaciones completos.
- El mock debe desactivarse en `platform_settings.mock_payments_enabled` antes de abrir producción.
- La interfaz del proveedor real se activa solo después de contar con credenciales y documentación contractual.

## Email y WhatsApp

El worker `/api/notifications/process` reclama entregas con un lease de 10 minutos, limita los intentos a cinco y evita que dos ejecuciones envíen la misma fila al mismo tiempo.

### Resend

Configurar:

```env
RESEND_API_KEY=...
CANCHEA_EMAIL_FROM=CANCHEA <reservas@dominio-verificado.com>
```

El correo usa el brand kit de CANCHEA y genera versión HTML y texto.

### WhatsApp Cloud API

Crear y aprobar una plantilla `canchea_notification` en Meta con idioma español y tres variables de cuerpo, en este orden:

1. título;
2. mensaje;
3. URL de acción.

Configurar:

```env
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v23.0
WHATSAPP_NOTIFICATION_TEMPLATE=canchea_notification
WHATSAPP_TEMPLATE_LANGUAGE=es
```

### Ejecución programada

`vercel.json` ejecuta el worker cada 15 minutos. `CRON_SECRET` es obligatorio y Vercel lo envía como Bearer token. Si ningún proveedor está configurado, el worker no reclama filas de la cola.

## Checklist antes de publicar

- [ ] Afiliar la empresa a Circle y recibir sandbox, contrato y documentación.
- [ ] Terminar el adaptador real y probar pago aprobado, rechazado, duplicado, tardío y reembolso.
- [ ] Verificar el dominio remitente en Resend.
- [ ] Crear la app de Meta, registrar el número y aprobar la plantilla de WhatsApp.
- [ ] Crear secretos distintos y largos para `SUPABASE_SECRET_KEY`, `CRON_SECRET` y webhooks.
- [ ] Activar protección de contraseñas filtradas al migrar a Supabase Pro. Mientras el piloto siga en Free, CANCHEA exige 10 caracteres con mayúscula, minúscula, número y símbolo.
- [ ] Configurar las URLs de producción en Supabase Auth y Google OAuth.
- [ ] Desactivar pagos mock en producción.
- [ ] Ejecutar `npm run typecheck`, `npm run lint` y `npm run build`.
- [ ] Ejecutar advisors de seguridad y rendimiento de Supabase.
- [ ] Hacer una reserva real de monto mínimo y conciliarla contra la liquidación del proveedor.

## Hosting y dominio

La aplicación puede probarse en preview, pero el lanzamiento comercial en Vercel requiere un plan apto para uso comercial. No se debe contratar ni comprar un dominio automáticamente. Al 1 de octubre de 2026, `canchea.dev` aparecía disponible por USD 13 el primer año y renovación, mientras `canchea.online` aparecía a USD 1,99 el primer año y USD 27 de renovación. `canchea.com`, `canchea.app`, `canchea.bo` y `canchea.com.bo` no aparecían disponibles en la consulta realizada.
