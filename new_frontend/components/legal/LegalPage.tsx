import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface LegalPageProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos y Condiciones" },
  { href: "/privacidad", label: "Política de Privacidad" },
  { href: "/reglas-monedas", label: "Reglas de monedas y apuestas" },
];

/** Contenedor de las páginas legales. El body de la app no scrollea, por eso el scroll vive acá. */
export const LegalPage = ({ title, updatedAt, children }: LegalPageProps) => (
  <main className="flex-1 overflow-y-auto bg-[#050505]">
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#C6C9AB] transition-colors hover:text-[#D2F000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D2F000]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al inicio
      </Link>

      <article className="rounded-2xl border border-[#353534] bg-[#131313] p-5 sm:p-8">
        <h1 className="font-headline text-2xl font-black uppercase tracking-wide text-[#E5E2E1] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-xs text-[#909378]">Última actualización: {updatedAt}</p>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-[#C6C9AB]">{children}</div>
      </article>

      <nav aria-label="Documentos legales" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[#C6C9AB] transition-colors hover:text-[#D2F000] focus-visible:outline-2 focus-visible:outline-[#D2F000]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  </main>
);

export const LegalSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-[#E5E2E1]">{title}</h2>
    {children}
  </section>
);
