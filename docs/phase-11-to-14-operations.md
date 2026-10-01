# Fases 11 a 14 — Administración, finanzas y confianza

## Super admin

- KPIs de usuarios, reservas, GMV, ingreso CANCHEA, saldo por liquidar, reembolsos, reclamos y aprobaciones.
- Operaciones con reservas, pagos, devoluciones, reclamos, liquidaciones y auditoría.
- Configuración central de hold, anticipación, seña, comisión, cancelaciones, prueba y recordatorios.
- Exportaciones CSV de usuarios, complejos, reservas, pagos y comisiones sin contraseñas ni secretos.

## Finanzas

- Ledger de doble partida para pagos, cancelaciones, reembolsos y liquidaciones.
- Reembolsos con estado y referencia externa.
- Liquidaciones por complejo y periodo, con reservas únicas por liquidación.
- Cero transacciones desbalanceadas en la verificación final.

## Notificaciones

- Bandeja in-app por usuario con lectura individual o masiva.
- Eventos para confirmación, cambios de estado, cancelaciones, reclamos y aprobación de complejos.
- Recordatorios de reservas programados cada 15 minutos mediante `pg_cron`.
- Cola multicanal preparada para email y WhatsApp. Los envíos externos quedan en `queued` hasta configurar y aprobar proveedores.

## Fidelización y confianza

- Favoritos de complejos y canchas.
- Valoraciones exclusivamente sobre reservas completadas, con agregados por cancha y complejo.
- Reclamos vinculados a una reserva y flujo de revisión del super admin.
- Rankings orgánicos por valoración verificada, reservas reales y antigüedad.
