"use client";

import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="h-12 bg-[#201f1f] border-t border-[#454932] flex items-center justify-between px-4 z-50 flex-shrink-0 text-xs">
      <div className="flex items-center gap-6">
        <a
          href="#"
          className="text-[10px] text-[#c6c9ab] hover:text-[#d2f000] transition-colors"
        >
          Términos y Condiciones
        </a>
        <a
          href="#"
          className="text-[10px] text-[#c6c9ab] hover:text-[#d2f000] transition-colors"
        >
          Política de Privacidad
        </a>
        <a
          href="#"
          className="text-[10px] text-[#c6c9ab] hover:text-[#d2f000] transition-colors"
        >
          Contacto / Soporte
        </a>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[#c6c9ab]">
          @Chiquimafias
        </span>
        <div className="w-5 h-5 bg-[#e5e2e1] flex items-center justify-center rounded-sm">
          <svg
            aria-hidden="true"
            className="w-3 h-3 fill-[#131313]"
            viewBox="0 0 24 24"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      </div>
    </footer>
  );
};
