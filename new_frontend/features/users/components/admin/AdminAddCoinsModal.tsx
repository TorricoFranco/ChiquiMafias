import React, { useState } from 'react';
import { Coins, X } from 'lucide-react';
import { UserEntity } from '../../types';
import { useAdminAddCoins } from '@/hooks/useWallet';
import { toast } from 'sonner';

interface AddCoinsModalProps {
  user: UserEntity | null;
  onClose: () => void;
}

export const AddCoinsModal: React.FC<AddCoinsModalProps> = ({ user, onClose }) => {
  const [amount, setAmount] = useState<number>(100);
  const [description, setDescription] = useState<string>('Regalo de Presidencia');
  
  const { mutate: addCoins, isPending, error } = useAdminAddCoins();

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    addCoins(
      { userId: user.id, amount, description },
      {
        onSuccess: () => {
          toast.success(`Se acreditaron ${amount.toLocaleString('es-AR')} monedas a @${user.username}`);
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-coins-title"
        className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 w-full max-w-md shadow-xl relative"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-[#909378] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-[#d2f000]" />
          <h2 id="add-coins-title" className="text-base font-bold text-[#e5e2e1]">Recargar Monedas</h2>
        </div>

        <p className="text-xs text-[#909378] mb-4">
          Acreditar monedas al usuario <span className="text-[#e5e2e1] font-bold">@{user.username}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="add-coins-amount" className="block text-xs font-semibold text-[#c6c9ab] mb-1">Monto</label>
            <input
              id="add-coins-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="add-coins-description" className="block text-xs font-semibold text-[#c6c9ab] mb-1">Descripción</label>
            <input
              id="add-coins-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#131313] border border-[#353534] focus:border-[#d2f000] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-medium">{(error as Error).message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#909378] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-[#d2f000] hover:bg-[#bada00] text-black font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Cargando...' : 'Acreditar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};