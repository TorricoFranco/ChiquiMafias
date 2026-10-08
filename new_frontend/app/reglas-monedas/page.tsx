import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Reglas de monedas y apuestas - Estadio Digital",
};

// TODO: texto base, pendiente de revisión por un abogado antes del lanzamiento.
export default function ReglasMonedasPage() {
  return (
    <LegalPage title="Reglas de monedas y apuestas" updatedAt="octubre de 2026">
      <LegalSection title="1. Las monedas son virtuales">
        <p>
          Las Chiqui-Coins son un elemento virtual del juego. No son dinero, no tienen valor monetario, no se pueden
          canjear ni retirar por dinero ni por premios con valor económico, y no se pueden transferir entre usuarios.
        </p>
      </LegalSection>
      <LegalSection title="2. Cómo se obtienen y se usan">
        <p>
          Se obtienen con la recompensa diaria, la actividad en la plataforma, las suscripciones o la compra de
          paquetes. Se usan para realizar pronósticos y para adquirir ítems de la tienda.
        </p>
      </LegalSection>
      <LegalSection title="3. Pronósticos (apuestas virtuales)">
        <p>
          Los pronósticos funcionan en modalidad pari-mutuel: las monedas apostadas forman un pozo que se reparte
          entre quienes acertaron, en proporción a lo apostado. Si un mercado se anula, las monedas se devuelven.
        </p>
      </LegalSection>
      <LegalSection title="4. Compras y reembolsos">
        <p>
          Las compras de monedas se pagan con Mercado Pago. Si un pago es rechazado o se contracarga, las monedas
          acreditadas por esa compra se descuentan de tu saldo. Las monedas ya gastadas en pronósticos o en la
          tienda no se reembolsan.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
