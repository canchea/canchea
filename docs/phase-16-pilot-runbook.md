# Fase 16 — Runbook del piloto

## Alcance recomendado

- 3 a 5 complejos verificados.
- 20 a 50 jugadores invitados.
- Una semana de operación supervisada antes de abrir registro general.
- Pagos Mock únicamente para pruebas internas. No solicitar dinero real hasta integrar un proveedor boliviano aprobado.

## Infraestructura gratuita de pruebas

- Correo temporal: una cuenta Gmail exclusiva para CANCHEA.
- URL temporal: subdominio gratuito `*.vercel.app` bajo el plan Hobby, sólo para desarrollo y pruebas no comerciales.
- Experiencia móvil: la web expone un manifiesto PWA e iconos de marca para instalarse desde Chrome o Safari sin pasar por una tienda. El piloto sigue necesitando conexión a internet y no promete funcionamiento offline.
- El worker externo de notificaciones lo dispara `pg_cron` cada 5 minutos (`canchea-notification-dispatch`) mediante `pg_net`, sólo cuando hay entregas pendientes. El cron diario de Vercel queda como respaldo. Requiere crear una vez por entorno, en el SQL Editor de Supabase:

  ```sql
  select vault.create_secret('https://TU_DOMINIO/api/notifications/process', 'canchea_notifications_url');
  select vault.create_secret('EL_MISMO_VALOR_DE_CRON_SECRET', 'canchea_cron_secret');
  ```

  Sin esos secretos la tarea no hace nada. Las llamadas quedan registradas en `net._http_response`.
- Antes de cobrar reservas o usar CANCHEA comercialmente, migrar desde Hobby a una modalidad permitida para uso comercial.

## Lista de salida

1. Crear el correo corporativo definitivo de CANCHEA y transferir las cuentas de Google, Supabase y futuros proveedores.
2. Mantener el requisito reforzado de 10 caracteres con mayúscula, minúscula, número y símbolo. La protección automática contra contraseñas filtradas requiere Supabase Pro y deberá activarse al migrar de plan antes de aceptar pagos reales.
3. Configurar `SUPABASE_SECRET_KEY` y `CANCHEA_MOCK_WEBHOOK_SECRET` sólo en el servidor.
4. Elegir proveedor QR/pagos, email y WhatsApp; implementar sus adaptadores y webhooks en sandbox.
5. Ejecutar una reserva completa por rol: jugador, propietario y super admin.
6. Validar cancelación temprana, tardía y no-show con el equipo operativo.
7. Confirmar quién procesa reembolsos y quién autoriza liquidaciones.
8. Revisar que `mock_payments_enabled` esté en `false` antes de aceptar pagos reales.
9. Revisar jurídicamente y ratificar las páginas piloto ya publicadas de términos, privacidad, cancelaciones y soporte antes de cobrar dinero real.
10. Monitorear diariamente errores, reservas, conversión, reclamos, reembolsos y ledger.
11. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio definitivo y comprobar canonical, Open Graph, `robots.txt` y `sitemap.xml` en producción.
12. Registrar el sitemap en Google Search Console cuando el dominio esté público.

## Instalación durante el piloto

- Android con Chrome: menú del navegador → **Instalar aplicación** o **Agregar a pantalla principal**.
- iPhone con Safari: **Compartir** → **Agregar a inicio**.
- Confirmar en ambos casos que el icono de CANCHEA abre una ventana independiente y que inicio de sesión, búsqueda y reservas continúan funcionando.

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

## Decisión de inversión móvil

La web responsive es el piloto comercial y de producto de CANCHEA. Se utilizará para validar las interacciones, el mercado, el nicho, la operación y el volumen de reservas antes de invertir en aplicaciones móviles nativas.

La aplicación móvil no se iniciará por una fecha predeterminada. Se evaluará cuando el piloto demuestre:

- demanda sostenida de reservas;
- repetición de jugadores;
- deportes, zonas y perfiles que formen un nicho claro;
- conversión medible desde búsqueda hasta reserva confirmada;
- operación estable frente a cancelaciones, no-shows y soporte;
- una economía por reserva capaz de justificar la inversión adicional.

Fresha queda registrada únicamente como referencia funcional para la experiencia móvil: navegación inferior, búsqueda, mapa/lista, historial y perfil. La futura aplicación conservará la marca, los flujos deportivos y el lenguaje visual de CANCHEA. El detalle está documentado en `memory/projects/canchea.md`.
