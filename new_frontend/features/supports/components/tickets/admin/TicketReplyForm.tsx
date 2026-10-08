import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/uploadHelper';
import { TICKET_MESSAGE_MAX_LENGTH } from '../../../constants';

interface TicketReplyFormProps {
  onSendReply: (message: string, screenshotUrl?: string) => void;
  disabled?: boolean;
}

export const TicketReplyForm: React.FC<TicketReplyFormProps> = ({ onSendReply, disabled = false }) => {
  const [replyMessage, setReplyMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPending = isUploading || disabled;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || isPending) return;

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

    onSendReply(
      replyMessage.trim(),
      finalScreenshotUrl
    );

    setReplyMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-[#353534] bg-[#1c1b1b] rounded-b-2xl flex flex-col gap-2"
    >
      <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFile && (
        <div className="bg-[#131313] p-2.5 rounded-xl border border-[#353534] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Vista previa"
              className="w-9 h-9 object-cover rounded-lg border border-[#353534]"
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
            className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1"
          >
            Quitar
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${selectedFile
            ? 'bg-[#d2f000]/20 border-[#d2f000] text-[#d2f000]'
            : 'bg-[#131313] border-[#353534] text-[#c6c9ab] hover:text-white'
            }`}
          title="Adjuntar imagen / screenshot"
          aria-label="Adjuntar imagen"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <input
          type="text"
          aria-label="Respuesta del soporte"
          placeholder="Escribir respuesta oficial del soporte..."
          maxLength={TICKET_MESSAGE_MAX_LENGTH}
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          className="flex-1 bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3.5 py-2.5 rounded-xl outline-none"
        />

        <button
          type="submit"
          disabled={!replyMessage.trim() || isPending}
          className="bg-[#d2f000] text-[#191e00] hover:bg-[#b8d300] font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {isUploading ? 'Subiendo...' : 'Enviando...'}
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};