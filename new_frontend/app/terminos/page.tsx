import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos y Condiciones - Estadio Digital",
};

// TODO: texto base, pendiente de revisión por un abogado antes del lanzamiento.
export default function TerminosPage() {
  return (
    <LegalPage title="Términos y Condiciones" updatedAt="octubre de 2026">
      <LegalSection title="1. Qué es Estadio Digital">
        <p>
          Estadio Digital (Chiqui Mafias) es una plataforma de entretenimiento sobre fútbol argentino con datos en
          vivo, chat, encuestas y pronósticos realizados con monedas virtuales. Al crear una cuenta o usar el
          servicio aceptás estos términos.
        </p>
      </LegalSection>
      <LegalSection title="2. Edad mínima">
        <p>Tenés que ser mayor de 18 años para usar la plataforma, en particular los pronósticos con monedas.</p>
      </LegalSection>
      <LegalSection title="3. Tu cuenta">
        <p>
          Ingresás con tu cuenta de Google. Sos responsable de la actividad de tu cuenta y del nombre de usuario que
          elijas. No se permiten nombres ofensivos ni suplantar a otras personas.
        </p>
      </LegalSection>
      <LegalSection title="4. Monedas virtuales">
        <p>
          Las monedas (Chiqui-Coins) son un elemento virtual del juego: no son dinero, no tienen valor monetario, no
          se pueden canjear ni retirar por dinero y no son transferibles. Más detalle en las{" "}
          <Link href="/reglas-monedas" className="text-[#D2F000] underline">
            Reglas de monedas y apuestas
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="5. Compras y suscripciones">
        <p>
          Los precios se muestran en pesos argentinos y los pagos los procesa Mercado Pago. Las suscripciones se
          renuevan de forma automática cada mes hasta que las canceles desde Ajustes; seguís teniendo los beneficios
          hasta el fin del período pagado. Podés ejercer el derecho de arrepentimiento dentro de los 10 días corridos
          de la contratación escribiendo a Soporte &amp; Reclamos dentro de la app.
        </p>
      </LegalSection>
      <LegalSection title="6. Conducta y moderación">
        <p>
          Está prohibido el spam, el acoso, el discurso de odio y el uso de cuentas múltiples para obtener ventajas.
          El equipo de moderación puede silenciar o suspender cuentas que incumplan estas reglas; podés apelar desde
          Soporte &amp; Reclamos.
        </p>
      </LegalSection>
      <LegalSection title="7. Cambios y contacto">
        <p>
          Podemos actualizar estos términos y te lo vamos a informar en la app. Para consultas o reclamos usá la
          sección Soporte &amp; Reclamos.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
