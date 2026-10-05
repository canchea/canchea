import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo CANCHEA trata los datos personales durante el piloto web.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Tus datos"
      title="Política de privacidad"
      summary="Qué información utilizamos, para qué la necesitamos y cómo puedes ejercer control sobre ella."
      notice={<p>Esta política adopta principios de finalidad, proporcionalidad, seguridad, confidencialidad y transparencia para el piloto. No vendemos datos personales.</p>}
      sections={[
        {
          id: "datos",
          title: "1. Datos que tratamos",
          content: <ul><li>Cuenta y perfil: correo, nombre, apellido, teléfono, ciudad, rol y estado de verificación.</li><li>Reservas: complejo, cancha, fecha, horario, importes, estados, cancelaciones, valoraciones y reclamos.</li><li>Complejos: datos comerciales, contacto, ubicación, fotografías, horarios y responsables autorizados.</li><li>Datos técnicos: sesiones de acceso, registros de seguridad, dispositivo, navegador e incidencias.</li><li>Ubicación aproximada sólo cuando el usuario la autoriza para ordenar resultados cercanos.</li></ul>,
        },
        {
          id: "finalidades",
          title: "2. Para qué utilizamos los datos",
          content: <ul><li>Crear y proteger cuentas.</li><li>Mostrar disponibilidad y procesar reservas.</li><li>Notificar cambios y facilitar soporte.</li><li>Prevenir fraude, dobles reservas y accesos no autorizados.</li><li>Generar métricas agregadas para mejorar el piloto.</li><li>Cumplir obligaciones, resolver reclamos y mantener trazabilidad operativa.</li></ul>,
        },
        {
          id: "proveedores",
          title: "3. Proveedores y transferencias",
          content: <><p>Usamos proveedores tecnológicos para operar la plataforma, principalmente Supabase para autenticación y base de datos, Vercel para alojamiento y Google cuando el usuario elige iniciar sesión con esa cuenta.</p><p>Estos servicios pueden procesar información fuera de Bolivia bajo sus propias medidas de seguridad y condiciones contractuales. Compartimos únicamente la información necesaria para prestar el servicio, protegerlo o cumplir una obligación válida.</p></>,
        },
        {
          id: "conservacion",
          title: "4. Conservación",
          content: <p>Conservamos los datos mientras la cuenta esté activa y durante el tiempo necesario para reservas, seguridad, reclamos y obligaciones operativas. Las solicitudes de eliminación se evaluarán considerando registros que deban mantenerse para auditoría, prevención de fraude o resolución de disputas.</p>,
        },
        {
          id: "seguridad",
          title: "5. Seguridad",
          content: <p>Aplicamos control de acceso por roles, cifrado en tránsito, aislamiento de datos, registros de auditoría y contraseñas almacenadas mediante el sistema seguro de Supabase Auth. Ninguna medida elimina todo riesgo; por eso investigaremos y comunicaremos incidentes relevantes conforme corresponda.</p>,
        },
        {
          id: "derechos",
          title: "6. Tus decisiones",
          content: <><p>Puedes solicitar acceso, corrección, actualización o eliminación de tu información, así como consultar el uso que hacemos de ella. También puedes retirar permisos opcionales, como ubicación, desde tu dispositivo.</p><p>Envía la solicitud desde el correo asociado a tu cuenta a <a href="mailto:somoscanchea@gmail.com">somoscanchea@gmail.com</a>. Podremos pedir una verificación razonable de identidad antes de responder.</p></>,
        },
        {
          id: "cookies",
          title: "7. Cookies y almacenamiento local",
          content: <p>Utilizamos cookies y almacenamiento técnico necesarios para mantener la sesión, proteger el acceso y recordar funciones esenciales. Durante el piloto no utilizamos estos mecanismos para vender perfiles publicitarios.</p>,
        },
        {
          id: "cambios",
          title: "8. Actualizaciones",
          content: <p>Publicaremos aquí cualquier cambio material y actualizaremos la fecha del documento. Antes del lanzamiento comercial se incorporarán la identidad legal, domicilio y datos definitivos del responsable del tratamiento.</p>,
        },
      ]}
    />
  );
}
