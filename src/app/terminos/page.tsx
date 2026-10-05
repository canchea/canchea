import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de CANCHEA durante el piloto web controlado.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Reglas claras"
      title="Términos y condiciones"
      summary="Las reglas para buscar, publicar y reservar canchas mediante CANCHEA durante el piloto web."
      notice={<p>CANCHEA se encuentra en un piloto controlado. Los pagos disponibles son simulaciones y no representan cobros reales. Antes de una apertura comercial, estos términos deberán ser revisados con asesoría jurídica boliviana y completados con la identidad legal del operador.</p>}
      sections={[
        {
          id: "alcance",
          title: "1. Alcance del servicio",
          content: <><p>CANCHEA es una plataforma que conecta a jugadores con complejos deportivos. Permite consultar disponibilidad, comparar información, crear reservas y administrarlas.</p><p>Cada complejo es responsable de la exactitud de sus horarios, precios, instalaciones y de prestar el servicio deportivo ofrecido. CANCHEA facilita la intermediación, la trazabilidad de la reserva y los canales de soporte.</p></>,
        },
        {
          id: "cuentas",
          title: "2. Cuentas y responsabilidades",
          content: <ul><li>La información registrada debe ser verdadera, completa y mantenerse actualizada.</li><li>Las credenciales son personales. El usuario debe proteger su contraseña y avisar si detecta un acceso no autorizado.</li><li>No se permite suplantar identidades, interferir con la plataforma, crear reservas fraudulentas ni utilizar información de otros usuarios sin autorización.</li><li>CANCHEA puede limitar una cuenta cuando exista fraude, abuso, riesgo de seguridad o incumplimiento reiterado, respetando los derechos aplicables del usuario.</li></ul>,
        },
        {
          id: "reservas",
          title: "3. Reservas y precios",
          content: <><p>La disponibilidad y el precio vigentes se muestran antes de confirmar. Actualmente una reserva debe solicitarse con al menos una hora de anticipación y el horario se retiene temporalmente durante cinco minutos mientras se completa el flujo.</p><p>La seña se calcula como el mayor valor entre Bs 50 y la comisión del 10% del horario, sin superar el precio total. El importe exacto siempre se presenta antes de confirmar. Durante el piloto el proveedor de pagos es Mock y no mueve dinero real.</p></>,
        },
        {
          id: "cancelaciones",
          title: "4. Cancelaciones e inasistencias",
          content: <p>Las devoluciones y penalizaciones se aplican según la <Link href="/cancelaciones">Política de cancelaciones</Link> publicada. Al reservar, el jugador acepta esas condiciones y el complejo se compromete a respetar el horario confirmado.</p>,
        },
        {
          id: "contenido",
          title: "5. Contenido y valoraciones",
          content: <p>Las fotografías, descripciones y valoraciones deben corresponder a experiencias reales y no pueden incluir contenido ilícito, ofensivo o engañoso. CANCHEA puede moderar contenido que incumpla estas reglas y conservar evidencia cuando sea necesaria para resolver un reclamo.</p>,
        },
        {
          id: "reclamos",
          title: "6. Reclamos y soporte",
          content: <p>Los usuarios pueden reportar problemas desde su cuenta o mediante <Link href="/soporte">Soporte CANCHEA</Link>. Revisaremos la reserva, su historial y la evidencia disponible. Estos términos no limitan los derechos reconocidos por la normativa boliviana aplicable a usuarios y consumidores.</p>,
        },
        {
          id: "cambios",
          title: "7. Cambios y contacto",
          content: <p>Podremos actualizar estas condiciones cuando cambie el piloto, la operación o la normativa. La versión vigente mostrará su fecha de actualización. Las consultas pueden enviarse a <a href="mailto:somoscanchea@gmail.com">somoscanchea@gmail.com</a>.</p>,
        },
      ]}
    />
  );
}
