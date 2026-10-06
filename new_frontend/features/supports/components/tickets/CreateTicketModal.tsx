import React, { useState, useRef } from 'react';
import {
  X,
  PlusCircle,
  HelpCircle,
  Scale,
  MessageSquare,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { uploadToCloudinary } from "@/lib/uploadHelper";
import { TicketCategory, CreateTicketPayload } from '../../types';
import { TICKET_MESSAGE_MAX_LENGTH, TICKET_SUBJECT_MAX_LENGTH } from '../../constants';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTicketPayload) => void;
  initialCategory?: TicketCategory;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCategory = 'SUPPORT',
}) => {
  const [category, setCategory] = useState<TicketCategory>(initialCategory);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false); // <--- Movido aquí arriba (antes del if)
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen no puede pesar más de 2MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const isSubjectValid = subject.trim().length >= 5;
  const isMessageValid = message.trim().length >= 10;
  const isValidUrl =
    !screenshotUrl.trim() ||
    /^https?:\/\/.+\..+/i.test(screenshotUrl.trim());

  const canSubmit = isSubjectValid && isMessageValid && isValidUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    if (!canSubmit || isUploading) return;

    let finalScreenshotUrl = undefined;
    setIsUploading(true);

    if (selectedFile) {
      try {
        finalScreenshotUrl = await uploadToCloudinary(selectedFile);
      } catch (error) {
        alert("No se pudo subir la imagen. Intentá de nuevo.");
        setIsUploading(false);
        return;
      }
    }

    onSubmit({
      category,
      subject: subject.trim(),
      message: message.trim(),
      screenshotUrl: finalScreenshotUrl,
    });

    setSubject('');
    setMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setHasSubmitted(false);
    setIsUploading(false);
    onClose();
  };

  const categories = [
    {
      id: 'SUPPORT' as TicketCategory,
      title: 'Soporte Técnico & Pagos',
      desc: 'Problemas con cobros, compras de fichas, suscripción VIP o bugs en la plataforma.',
      icon: HelpCircle,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'APPEAL' as TicketCategory,
      title: 'Apelación de Sanción',
      desc: 'Revisión de silencios (timeout) en chat de Tribuna, advertencias o bloqueos.',
      icon: Scale,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'OTHER' as TicketCategory,
      title: 'Consultas & Sugerencias',
      desc: 'Preguntas generales sobre reglas, ideas para nuevos mercados o feedback.',
      icon: MessageSquare,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear Nuevo Reclamo / Ticket"
        className="relative bg-[#1c1b1b] border border-[#353534] rounded-2xl max-w-xl w-full p-6 z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#353534] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#d2f000]/10 border border-[#d2f000]/30 rounded-xl text-[#d2f000]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase tracking-wide">
                Crear Nuevo Reclamo / Ticket
              </h3>
              <p className="text-xs text-[#909378]">
                El equipo de moderación y soporte atenderá tu consulta a la brevedad.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#c6c9ab] hover:text-[#e5e2e1] p-1 rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#c6c9ab] mb-2">
              1. Seleccioná la Categoría <span className="text-[#d2f000]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${isSelected
                      ? 'bg-[#d2f000]/10 border-[#d2f000] shadow-[0_0_12px_rgba(210,240,0,0.15)]'
                      : 'bg-[#131313] border-[#353534] hover:border-[#4d4d4c]'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon
                        className={`w-4 h-4 ${isSelected ? 'text-[#d2f000]' : 'text-[#909378]'
                          }`}
                      />
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#d2f000]" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[#e5e2e1] block leading-snug">
                        {cat.title}
                      </span>
                      <span className="text-[10px] text-[#909378] mt-1 block leading-tight">
                        {cat.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="ticket-subject" className="block text-[11px] font-bold uppercase tracking-wider text-[#c6c9ab]">
                2. Asunto del Reclamo <span className="text-[#d2f000]">*</span>
              </label>
              <span
                className={`text-[10px] font-mono ${subject.length >= 5 ? 'text-[#909378]' : 'text-amber-400'
                  }`}
              >
                {subject.length} / mín. 5 carácteres
              </span>
            </div>
            <input
              id="ticket-subject"
              type="text"
              maxLength={TICKET_SUBJECT_MAX_LENGTH}
              placeholder="Ej: Problema al acreditar pago de fichas #19208..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full bg-[#131313] border text-xs text-[#e5e2e1] p-3 rounded-xl outline-none transition-colors ${hasSubmitted && !isSubjectValid
                ? 'border-red-500/80 focus:border-red-500'
                : 'border-[#353534] focus:border-[#d2f000]'
                }`}
            />
            {hasSubmitted && !isSubjectValid && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> El asunto debe tener al menos 5 caracteres.
              </p>
            )}
          </div>

          {/* Initial Message Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="ticket-message" className="block text-[11px] font-bold uppercase tracking-wider text-[#c6c9ab]">
                3. Detalle o Explicación <span className="text-[#d2f000]">*</span>
              </label>
              <span
                className={`text-[10px] font-mono ${message.length >= 10 ? 'text-[#909378]' : 'text-amber-400'
                  }`}
              >
                {message.length} / mín. 10 carácteres
              </span>
            </div>
            <textarea
              id="ticket-message"
              rows={4}
              maxLength={TICKET_MESSAGE_MAX_LENGTH}
              placeholder="Explicá con claridad lo ocurrido (ID de transacción, hora aproximada, detalle del problema)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full bg-[#131313] border text-xs text-[#e5e2e1] p-3 rounded-xl outline-none resize-none transition-colors ${hasSubmitted && !isMessageValid
                ? 'border-red-500/80 focus:border-red-500'
                : 'border-[#353534] focus:border-[#d2f000]'
                }`}
            />
            {hasSubmitted && !isMessageValid && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> El mensaje debe tener al menos 10 caracteres.
              </p>
            )}
          </div>

          {/* Screenshot URL (Optional) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#c6c9ab]">
                4. Captura de Pantalla / Comprobante (Opcional)
              </label>
              <span className="text-[10px] text-[#909378]">Máx. 2MB (PNG, JPG, WEBP)</span>
            </div>

            {/* Botón para seleccionar archivo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#131313] border border-[#353534] hover:border-[#d2f000] text-xs text-[#c6c9ab] py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-[#d2f000]" />
                <span>{selectedFile ? selectedFile.name : 'Seleccionar imagen desde tu dispositivo'}</span>
              </button>

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Vista previa y botón para remover */}
            {selectedFile && (
              <div className="mt-2.5 p-2.5 bg-[#131313] border border-[#353534] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Vista previa"
                    className="w-12 h-12 object-cover rounded-lg border border-[#353534]"
                  />
                  <div className="text-[11px] text-[#c6c9ab] overflow-hidden">
                    <span className="font-bold block text-[#e5e2e1] truncate max-w-[220px]">{selectedFile.name}</span>
                    <span className="text-[10px] text-[#909378]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1 cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#353534] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#c6c9ab] hover:text-[#e5e2e1] px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hasSubmitted && !canSubmit}
              className="bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(210,240,0,0.2)] cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar Reclamo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
