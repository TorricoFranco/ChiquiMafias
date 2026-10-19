import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidad - Estadio Digital",
};

// TODO: texto base, pendiente de revisión por un abogado antes del lanzamiento.
export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad" updatedAt="octubre de 2026">
      <LegalSection title="1. Qué datos guardamos">
        <p>
          Nombre y correo de tu cuenta de Google, el nombre de usuario y el equipo que elegís, tu actividad en la
          plataforma (mensajes de chat, votos, pronósticos, saldo de monedas, compras y suscripciones) y los tickets
          o reportes que envíes a Soporte.
        </p>
      </LegalSection>
      <LegalSection title="2. Para qué los usamos">
        <p>
          Para autenticarte, mostrar tu perfil y tu actividad, procesar pagos, moderar la comunidad y darte soporte.
          No vendemos tus datos.
        </p>
      </LegalSection>
      <LegalSection title="3. Terceros">
        <p>
          Usamos Google (inicio de sesión y fuentes), Mercado Pago (pagos) y Cloudinary (imágenes). Algunos de estos
          proveedores procesan datos fuera de Argentina.
        </p>
      </LegalSection>
      <LegalSection title="4. Cookies">
        <p>
          Usamos solo cookies técnicas necesarias para mantener tu sesión iniciada (acceso y renovación de sesión).
          No usamos cookies de publicidad ni de seguimiento.
        </p>
      </LegalSection>
      <LegalSection title="5. Tus derechos">
        <p>
          Según la Ley 25.326 podés acceder, rectificar y suprimir tus datos personales. La Agencia de Acceso a la
          Información Pública (AAIP), órgano de control de la ley, atiende denuncias y reclamos por incumplimientos.
        </p>
      </LegalSection>
      <LegalSection title="6. Contacto">
        <p id="contacto">
          Para ejercer tus derechos o hacer consultas, abrí un ticket en Soporte &amp; Reclamos dentro de la app.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
