"use client";

import { useInventoryStore } from "@/store/useInventoryStore";
import { X, Check, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function CustomizerModal({ onClose }: { onClose: () => void }) {
  const { items: inventoryItems, equipCosmetic, unequipCosmetic, loading } = useInventoryStore();
  const [syncId, setSyncId] = useState<string | null>(null);

  const equipables = inventoryItems.filter(
    (i) => i.item.type === "NAME_COLOR" || i.item.type === "BANNER"
  );

  const handleAction = async (itemId: string, isEquipped: boolean, type: string) => {
    try {
      setSyncId(itemId);
      if (isEquipped) {
        await unequipCosmetic(type as any);
      } else {
        await equipCosmetic(itemId);
      }
    } catch (err) {
      alert("Error al cambiar configuración del cosmético.");
    } finally {
      setSyncId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#141414] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white">Mi Inventario de Estilos</h2>
            <p className="text-xs text-gray-400">Activá tus colores y banners permanentes para lucirte en los chats</p>
          </div>
          <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Lista de Ítems Comprados */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-black/10">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
          ) : equipables.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-12">No tenés cosméticos permanentes comprados todavía, pa.</p>
          ) : (
            <div className="space-y-2">
              {equipables.map((inv) => {
                const isCurrentItemSyncing = syncId === inv.itemId;

                return (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between p-4 bg-[#1c1c1c] rounded-2xl border transition-all ${inv.isEquipped
                        ? "border-emerald-500/30 bg-emerald-500/[0.02] shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                        : "border-white/5 hover:border-white/10"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      {inv.item.type === "NAME_COLOR" ? (
                        <div className="w-10 h-10 rounded-xl border border-white/20 shadow-md flex-shrink-0" style={{ backgroundColor: inv.item.assetId }} />
                      ) : (
                        <div className="w-16 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-[9px] font-black text-gray-500 uppercase tracking-tight p-1 overflow-hidden flex-shrink-0">
                          <img
                            src={`/images/cosmetics/banners/${inv.item.assetId}.webp`}
                            alt="Preview"
                            className="w-full h-full object-cover rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{inv.item.name}</h4>
                        <span className="text-[8px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/10 uppercase tracking-wider inline-block mt-1">
                          {inv.item.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={syncId !== null}
                      onClick={() => handleAction(inv.itemId, inv.isEquipped, inv.item.type)}
                      className={`text-[10px] font-black uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${inv.isEquipped
                          ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/10"
                          : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5"
                        }`}
                    >
                      {isCurrentItemSyncing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : inv.isEquipped ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" /> Equipado
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" /> Equipar
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}