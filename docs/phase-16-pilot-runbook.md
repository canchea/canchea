# Fase 16 — Runbook del piloto

## Alcance recomendado

- 3 a 5 complejos verificados.
- 20 a 50 jugadores invitados.
- Una semana de operación supervisada antes de abrir registro general.
- Pagos Mock únicamente para pruebas internas. No solicitar dinero real hasta integrar un proveedor boliviano aprobado.

## Infraestructura gratuita de pruebas

- Correo temporal: una cuenta Gmail exclusiva para CANCHEA.
- URL temporal: subdominio gratuito `*.vercel.app` bajo el plan Hobby, sólo para desarrollo y pruebas no comerciales.
- El worker externo de notificaciones se ejecuta una vez al día por el límite de cron de Hobby. Para pruebas puntuales se puede invocar manualmente; antes del piloto operativo debe volver a una frecuencia de 15 minutos en una infraestructura compatible.
- Antes de cobrar reservas o usar CANCHEA comercialmente, migrar desde Hobby a una modalidad permitida para uso comercial.

## Lista de salida

1. Crear el correo corporativo definitivo de CANCHEA y transferir las cuentas de Google, Supabase y futuros proveedores.
2. Habilitar protección contra contraseñas filtradas en Supabase Auth.
3. Configurar `SUPABASE_SECRET_KEY` y `CANCHEA_MOCK_WEBHOOK_SECRET` sólo en el servidor.
4. Elegir proveedor QR/pagos, email y WhatsApp; implementar sus adaptadores y webhooks en sandbox.
5. Ejecutar una reserva completa por rol: jugador, propietario y super admin.
6. Validar cancelación temprana, tardía y no-show con el equipo operativo.
7. Confirmar quién procesa reembolsos y quién autoriza liquidaciones.
8. Revisar que `mock_payments_enabled` esté en `false` antes de aceptar pagos reales.
9. Publicar términos, privacidad, política de cancelación y canal de soporte.
10. Monitorear diariamente errores, reservas, conversión, reclamos, reembolsos y ledger.
11. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio definitivo y comprobar canonical, Open Graph, `robots.txt` y `sitemap.xml` en producción.
12. Registrar el sitemap en Google Search Console cuando el dominio esté público.

## Métricas del piloto

- búsquedas con disponibilidad y tasa de inicio de checkout;
- holds creados, pagados y vencidos;
- reservas confirmadas, canceladas y no-show;
- GMV, comisión, penalizaciones, reembolsos y saldo por liquidar;
- ocupación por complejo y cancha;
- tiempo de respuesta y resolución de reclamos;
- valoración promedio y repetición de jugadores.

## Criterio de avance

El piloto puede pasar a cobros reales cuando no existan transacciones desbalanceadas, los casos críticos de cancelación estén validados, soporte pueda resolver reclamos, exista un proveedor de pago aprobado y el Mock esté deshabilitado.
