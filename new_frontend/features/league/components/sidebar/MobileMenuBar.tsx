'use client';

import React from 'react';

interface MobileMenuBarProps {
  onOpen: () => void;
}

/** Franja de celular debajo del contenido, fuera del área que scrollea: el botón nunca tapa filas. */
export const MobileMenuBar: React.FC<MobileMenuBarProps> = ({ onOpen }) => {
  return (
    <div className="md:hidden shrink-0 flex justify-end px-4 py-2 bg-[#131313] border-t border-[#353534]">
      <button
        type="button"
        onClick={onOpen}
        className="bg-[#d2f000] text-[#191e00] px-4 py-3 rounded-full shadow-lg font-black uppercase text-xs tracking-wider"
      >
        Menú Ligas
      </button>
    </div>
  );
};
