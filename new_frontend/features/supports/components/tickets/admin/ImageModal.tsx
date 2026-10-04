import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
    onClick={onClose}
  >
    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20">
      <img
        src={imageUrl}
        alt="Ampliada"
        referrerPolicy="no-referrer"
        className="w-full h-auto max-h-[85vh] object-contain"
      />
      <button
        onClick={onClose}
        className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-full border border-white/20"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
);