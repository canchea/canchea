import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de cancelaciones",
  description: "Devoluciones, penalizaciones e inasistencias aplicables a las reservas CANCHEA.",
  alternates: { canonical: "/cancelaciones" },
};

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      eyebrow="Antes de reservar"
      title="Política de cancelaciones"
      summary="Una política escalonada para proteger al jugador, al complejo y la disponibilidad de cada cancha."
      notice={<p>Los valores descritos son la configuración vigente del piloto. La pantalla de confirmación siempre mostrará la seña y las condiciones aplicables antes de crear la reserva.</p>}
      sections={[
        {
          id: "resumen",
          title: "1. Resumen de la política",
          content: <div className="policy-table" role="table" aria-label="Resumen de cancelaciones"><div role="row"><strong role="columnheader">Situación</strong><strong role="columnheader">Resultado</strong></div><div role="row"><span role="cell">Cancelación con 6 horas o más</span><span role="cell">Devolución de la seña menos Bs 20 de penalización.</span></div><div role="row"><span role="cell">Cancelación con menos de 6 horas</span><span role="cell">Sin devolución de la seña.</span></div><div role="row"><span role="cell">Inasistencia o no-show</span><span role="cell">Sin devolución de la seña.</span></div></div>,
        },
        {
          id: "temprana",
          title: "2. Cancelación temprana",
          content: <p>Si el jugador cancela al menos seis horas antes del inicio, se retienen Bs 20 y se devuelve el resto de la seña. La penalización se reparte en partes iguales: Bs 10 para el complejo y Bs 10 para CANCHEA. Si la seña supera Bs 50, la devolución aumenta y la penalización se mantiene en Bs 20.</p>,
        },
        {
          id: "tardia",
          title: "3. Cancelación tardía",
          content: <p>Si faltan menos de seis horas, no existe devolución. La seña completa se considera penalización y se reparte 50% para el complejo y 50% para CANCHEA. Con la seña base de Bs 50, corresponden Bs 25 a cada parte.</p>,
        },
        {
          id: "no-show",
          title: "4. Inasistencia",
          content: <p>Cuando el jugador no se presenta y el complejo registra la inasistencia, no se devuelve la seña. Se aplica el mismo reparto de la cancelación tardía. El historial conserva quién marcó el estado y cuándo lo hizo.</p>,
        },
        {
          id: "complejo",
          title: "5. Problemas atribuibles al complejo",
          content: <p>Si el complejo no puede prestar el servicio confirmado, el jugador debe contactar a <Link href="/soporte">Soporte CANCHEA</Link>. Revisaremos la evidencia y, cuando corresponda, gestionaremos la devolución aplicable sin penalizar al jugador.</p>,
        },
        {
          id: "proceso",
          title: "6. Cómo cancelar o reclamar",
          content: <ol><li>Ingresa a tu cuenta y abre la reserva.</li><li>Selecciona cancelar y revisa el cálculo mostrado.</li><li>Conserva la confirmación y las notificaciones.</li><li>Si existe una diferencia, abre un reclamo dentro de los siete días posteriores al servicio.</li></ol>,
        },
        {
          id: "piloto",
          title: "7. Pagos durante el piloto",
          content: <p>El proveedor Mock simula órdenes, pagos y devoluciones para validar la operación; no mueve dinero. La política se mantendrá como regla operativa, pero los reembolsos monetarios sólo se habilitarán después de integrar y probar un proveedor real.</p>,
        },
      ]}
    />
  );
}
