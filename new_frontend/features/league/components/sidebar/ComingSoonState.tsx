import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ComingSoonStateProps {
  onBackToLPF: () => void;
}

export const ComingSoonState: React.FC<ComingSoonStateProps> = ({ onBackToLPF }) => {
  return (
    <div className="px-1 flex flex-col gap-3 py-2">
      <div className="bg-[#141414] border border-[#353534] rounded-2xl p-3.5 flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#d2f000]">
          Competición en Preparación
        </span>
        <p className="text-xs text-[#c6c9ab] leading-relaxed">
          El fixture interactivo y las estadísticas en vivo de esta copa se
          habilitarán próximamente.
        </p>
        <button
          onClick={onBackToLPF}
          className="mt-1 flex items-center justify-center gap-1.5 bg-[#d2f000] hover:bg-[#b5cf00] text-[#191e00] font-black text-xs py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Liga Profesional</span>
        </button>
      </div>
    </div>
  );
};