// src/components/polls/ProposePollModal.tsx
"use client";

import { useState } from "react";
import { useInventoryStore } from "@/store/useInventoryStore";
import { POLL_ICONS } from "@/constants/poll-icons";
import { toast } from "sonner";
import { Plus, Trash, X, Ticket } from "lucide-react";

interface ProposePollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProposePollModal({ isOpen, onClose }: ProposePollModalProps) {
  const { items, proposeUserPoll } = useInventoryStore();
  
  // 1. Validamos si el usuario tiene el consumible en su inventario
  const pollTicket = items.find(
    (inv) => inv.item?.type === "CUSTOM_POLL" && inv.quantity > 0
  );

  // Estados del formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("USER");
  const [options, setOptions] = useState<string[]>(["", ""]); // Arranca con 2 opciones vacías
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Manejo de opciones dinámicas
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOptionField = () => {
    if (options.length >= 5) {
      toast.error("Podés poner un máximo de 5 opciones por encuesta.");
      return;
    }
    setOptions([...options, ""]);
  };

  const removeOptionField = (index: number) => {
    if (options.length <= 2) {
      toast.error("La encuesta debe tener al menos 2 opciones.");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pollTicket) {
      toast.error("No tenés ningún Ticket de Encuesta en tu inventario ❌");
      return;
    }

    if (!title.trim()) {
      toast.error("Por favor, ingresá un título para la encuesta.");
      return;
    }

    // Filtrar opciones vacías y validar el mínimo real de 2
    const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt !== "");
    if (validOptions.length < 2) {
      toast.error("Tenés que completar al menos 2 opciones válidas.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Disparamos la acción del store (que le pega al backend y refresca el inventario)
      await proposeUserPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        options: validOptions,
        icon,
      });

      toast.success("¡Propuesta enviada! Esperando aprobación del admin ⏳");
      
      // Resetear formulario y cerrar modal
      setTitle("");
      setDescription("");
      setIcon("USER");
      setOptions(["", ""]);
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Hubo un problema al proponer la encuesta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#181818] border border-[#2b2b2b] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-lime-400" />
            <h3 className="text-lg font-bold text-white">Proponer Nueva Encuesta</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Formulario */}
        {!pollTicket ? (
          /* Estado: No tiene tickets */
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-red-500/10 rounded-full text-red-500">
              <Ticket className="w-10 h-10" />
            </div>
            <p className="text-gray-300 font-medium">
              No tenés ningún <span className="text-lime-400">Ticket de Encuesta</span> disponible.
            </p>
            <p className="text-xs text-gray-500 max-w-xs">
              Podés conseguir Tickets de Encuestas personalizadas en la tienda del sitio canjeando tus monedas.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-[#2b2b2b] text-white rounded-lg text-sm hover:bg-[#363636] transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          /* Estado: Tiene tickets (Muestra el formulario) */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
            
            {/* Alerta informativa de consumible */}
            <div className="p-3 bg-lime-400/5 border border-lime-400/20 rounded-xl flex items-center justify-between text-xs text-lime-400/90">
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" /> Disponibles en tu inventario:
              </span>
              <span className="font-bold bg-lime-400/20 px-2 py-0.5 rounded-full">
                {pollTicket.quantity} uds
              </span>
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Título de la Encuesta *
              </label>
              <input
                type="text"
                maxLength={80}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: ¿Quién fue la figura del partido?"
                className="w-full p-3 bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-400/50 text-sm transition-colors"
              />
            </div>

            {/* Descripción (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Contexto o Descripción (Opcional)
              </label>
              <textarea
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Añadí un subtítulo o aclaración para los votantes..."
                rows={2}
                className="w-full p-3 bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-400/50 text-sm resize-none transition-colors"
              />
            </div>

            {/* Selector de Icono */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Icono Distintivo
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {Object.keys(POLL_ICONS).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`p-3 rounded-xl border text-lg transition-all flex-shrink-0 ${
                      icon === key
                        ? "bg-lime-400/10 border-lime-400 text-lime-400 scale-105"
                        : "bg-[#1f1f1f] border-[#2b2b2b] text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {POLL_ICONS[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones Dinámicas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Opciones de Votación *
                </label>
                <button
                  type="button"
                  onClick={addOptionField}
                  disabled={options.length >= 5}
                  className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir Opción
                </button>
              </div>

              {options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center animate-slideIn">
                  <span className="text-xs font-bold text-gray-600 w-4">{index + 1}.</span>
                  <input
                    type="text"
                    maxLength={40}
                    required={index < 2} // Las primeras 2 son obligatorias en HTML nativo
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1 p-2.5 bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-400/50 text-sm transition-colors"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOptionField(index)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer de Acciones */}
            <div className="pt-4 border-t border-[#2b2b2b] flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-lime-400 hover:bg-lime-300 disabled:bg-lime-900 text-black text-sm font-bold rounded-xl shadow-lg shadow-lime-400/10 active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? "Enviando..." : "Gastar Ticket & Proponer"}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}