"use client";

import { useId } from "react";
import Link from "next/link";

interface Props {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export const TERMS_REQUIRED_MESSAGE = "Tenés que aceptar los Términos y confirmar que sos mayor de 18 años.";

/** Aceptación de Términos y Política de Privacidad + declaración de mayoría de edad. */
export default function TermsCheckbox({ checked, onChange, disabled }: Props) {
    const id = useId();

    return (
        <div className="flex items-start gap-3">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#D2F000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
            />
            <label htmlFor={id} className="text-xs leading-relaxed text-[#C6C9AB]">
                Soy mayor de 18 años y acepto los{" "}
                <Link href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#D2F000] underline">
                    Términos y Condiciones
                </Link>
                , la{" "}
                <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-[#D2F000] underline">
                    Política de Privacidad
                </Link>{" "}
                y las{" "}
                <Link href="/reglas-monedas" target="_blank" rel="noopener noreferrer" className="text-[#D2F000] underline">
                    Reglas de monedas
                </Link>
                .
            </label>
        </div>
    );
}
