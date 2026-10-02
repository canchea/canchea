# CANCHEA

Marketplace de reservas deportivas para Santa Cruz de la Sierra. Construido con Next.js 16, React 19, TypeScript y Supabase.

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

Variables requeridas en `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
SUPABASE_SECRET_KEY=
CANCHEA_MOCK_WEBHOOK_SECRET=
```

Nunca uses una clave `service_role` en una variable `NEXT_PUBLIC_*`.

## Verificación

```bash
npm run lint
npm run typecheck
npm run build
```

## Documentación

- [Pagos, notificaciones y checklist de lanzamiento](docs/PAGOS-Y-LANZAMIENTO.md)

- [Sistema de diseño](docs/design-system.md)
- [Fase 2 — Supabase y autenticación](docs/phase-2-supabase-auth.md)
- [Fase 3 — Complejos deportivos](docs/phase-3-venues.md)
- [Fase 4 — Canchas](docs/phase-4-courts.md)
- [Fase 5 — Horarios, precios y disponibilidad](docs/phase-5-schedules-pricing.md)
- [Fase 6 — Búsqueda](docs/phase-6-search.md)
- [Fase 7 — Motor de reservas](docs/phase-7-booking-engine.md)
- [Fase 8 — Pagos y ledger](docs/phase-8-payments.md)
- [Fase 9 — Panel del jugador](docs/phase-9-player-dashboard.md)
- [Fase 10 — Panel del propietario](docs/phase-10-owner-dashboard.md)
- [Fases 11 a 14 — Administración, finanzas y confianza](docs/phase-11-to-14-operations.md)
- [Fase 15 — QA y endurecimiento](docs/phase-15-qa.md)
- [Fase 16 — Runbook del piloto](docs/phase-16-pilot-runbook.md)
- [Auditoría final interna de la web](docs/web-final-audit.md)

## Estado del producto

- Fase 1: landing y sistema visual.
- Fase 2: autenticación, onboarding y roles.
- Fase 3: registro, fotos, servicios, ubicación y aprobación de complejos.
- Fase 4: canchas, deportes, modalidades, superficies, características, duraciones y fotos.
- Fase 5: horarios semanales, reglas de precio, bloqueos manuales y disponibilidad calculada desde backend.
- Fase 6: búsqueda pública con filtros, disponibilidad real, precios, distancia opcional, lista y detalle seleccionado.
- Fase 7: checkout, hold de cinco minutos, prevención transaccional de dobles reservas, códigos públicos, estados e historial.
- Fase 8: proveedor Mock, órdenes y webhooks idempotentes, seña, estados de pago, ledger y preparación para QR boliviano.
- Fase 9: panel del jugador, historial, cancelaciones escalonadas, favoritos, valoraciones y reclamos.
- Fase 10: KPIs, calendario, operación de reservas y exportación para propietarios.
- Fase 11: super admin con KPIs, operaciones, auditoría y configuración global.
- Fase 12: reembolsos, liquidaciones y movimientos financieros compensatorios.
- Fase 13: notificaciones in-app, cola multicanal y recordatorios programados.
- Fase 14: reseñas verificadas, favoritos, reclamos y rankings orgánicos.
- Fase 15: QA, RLS, Advisors, índices, build y verificación financiera.
- Fase 16: preparación del piloto y checklist de salida.

El MVP funcional está preparado para un piloto controlado. Los pagos reales y los envíos externos requieren elegir y aprobar proveedores antes de producción.
