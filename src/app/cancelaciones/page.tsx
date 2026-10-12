import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de cancelaciones",
  description: "Cancelaciones e inasistencias aplicables a las reservas gratuitas de CANCHEA.",
  alternates: { canonical: "/cancelaciones" },
};

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      eyebrow="Antes de reservar"
      title="Política de cancelaciones"
      summary="Reservar no tiene costo, pero liberar a tiempo el horario ayuda a jugadores y complejos."
      notice={<p>CANCHEA no cobra una seña al jugador. Si cambias de plan, cancela desde tu cuenta lo antes posible para que otra persona pueda reservar.</p>}
      sections={[
        {
          id: "resumen",
          title: "1. Resumen de la política",
          content: <div className="policy-table" role="table" aria-label="Resumen de cancelaciones"><div role="row"><strong role="columnheader">Situación</strong><strong role="columnheader">Resultado</strong></div><div role="row"><span role="cell">Cancelación antes del inicio</span><span role="cell">Sin cobro; el horario vuelve a estar disponible.</span></div><div role="row"><span role="cell">Inasistencia o no-show</span><span role="cell">Se registra en el historial de confianza del jugador.</span></div><div role="row"><span role="cell">Inasistencias reiteradas</span><span role="cell">CANCHEA puede limitar temporalmente nuevas reservas.</span></div></div>,
        },
        {
          id: "cancelar",
          title: "2. Cómo cancelar",
          content: <ol><li>Ingresa a tu cuenta y abre la reserva.</li><li>Selecciona “Cancelar reserva”.</li><li>Confirma para liberar inmediatamente la cancha.</li></ol>,
        },
        {
          id: "inasistencia",
          title: "3. Inasistencias",
          content: <p>Si el jugador no llega, el complejo puede marcar la reserva como no-show una vez finalizado el horario. CANCHEA conserva ese evento para detectar incumplimientos reiterados. Durante el piloto no existe una penalización monetaria automática para el jugador.</p>,
        },
        {
          id: "confianza",
          title: "4. Medidas de confianza",
          content: <p>Podemos advertir, limitar temporalmente o revisar cuentas con cancelaciones tardías o inasistencias reiteradas. Antes de una restricción permanente se evaluará el historial y cualquier reclamo abierto.</p>,
        },
        {
          id: "complejo",
          title: "5. Problemas atribuibles al complejo",
          content: <p>Si el complejo no respeta una reserva confirmada, repórtalo en <Link href="/soporte">Soporte CANCHEA</Link>. Revisaremos el historial y podremos pausar la publicación del complejo o aplicar otras medidas operativas.</p>,
        },
        {
          id: "pagos",
          title: "6. Pagos",
          content: <p>El jugador paga directamente al complejo cuando utiliza la cancha. Como CANCHEA no cobra por anticipado, una cancelación normal no genera devolución ni trámite bancario.</p>,
        },
      ]}
    />
  );
}
