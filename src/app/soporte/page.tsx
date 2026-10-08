import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Soporte",
  description: "Canales de ayuda y reclamos para jugadores y complejos en CANCHEA.",
  alternates: { canonical: "/soporte" },
};

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Estamos para ayudarte"
      title="Soporte CANCHEA"
      summary="Cómo reportar un problema con tu cuenta, una reserva o la información de un complejo."
      notice={<p>Canal de soporte del piloto: <a href="mailto:somoscanchea@gmail.com">somoscanchea@gmail.com</a>. Escribe desde el correo asociado a tu cuenta y nunca envíes tu contraseña.</p>}
      sections={[
        {
          id: "canales",
          title: "1. Canales disponibles",
          content: <ul><li>Correo: <a href="mailto:somoscanchea@gmail.com">somoscanchea@gmail.com</a>.</li><li>Jugadores autenticados: sección de reclamos dentro de la cuenta.</li><li>Propietarios: panel operativo del complejo y correo de soporte.</li></ul>,
        },
        {
          id: "informacion",
          title: "2. Qué información enviar",
          content: <ul><li>Código público de la reserva.</li><li>Descripción breve y fecha del problema.</li><li>Capturas o comprobantes pertinentes, sin contraseñas ni datos bancarios completos.</li><li>La solución que esperas: corrección, aclaración, cancelación o revisión de devolución.</li></ul>,
        },
        {
          id: "reclamos",
          title: "3. Reclamos de reservas",
          content: <p>Los reclamos pueden abrirse hasta siete días después del servicio. Revisaremos el historial de estados, pagos, mensajes operativos y evidencia aportada por ambas partes. Consulta también la <Link href="/cancelaciones">Política de cancelaciones</Link>.</p>,
        },
        {
          id: "seguridad",
          title: "4. Seguridad de la cuenta",
          content: <p>Si sospechas que alguien accedió a tu cuenta, cambia tu contraseña cuando la función esté disponible y escríbenos de inmediato. CANCHEA nunca solicitará tu contraseña por correo, WhatsApp o llamada.</p>,
        },
        {
          id: "urgencias",
          title: "5. Emergencias",
          content: <p>CANCHEA no es un servicio de emergencia. Ante lesiones, riesgos físicos o situaciones urgentes, contacta al complejo y a los servicios locales correspondientes.</p>,
        },
        {
          id: "respuesta",
          title: "6. Seguimiento",
          content: <p>Durante el piloto priorizaremos problemas que impidan jugar, afecten una reserva o comprometan una cuenta. Mantendremos la comunicación en el mismo correo o reclamo para conservar la trazabilidad.</p>,
        },
        {
          id: "instalacion",
          title: "7. Instalar CANCHEA en el teléfono",
          content: <><p>Puedes usar el piloto como una aplicación, sin descargarla desde una tienda.</p><ul><li>Android con Chrome: abre el menú del navegador y elige <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</li><li>iPhone con Safari: toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.</li></ul><p>La instalación crea el icono de CANCHEA y abre la web en una ventana independiente. Las reservas siguen necesitando conexión a internet.</p></>,
        },
      ]}
    />
  );
}
