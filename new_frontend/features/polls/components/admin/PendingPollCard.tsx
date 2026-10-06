import React from 'react';
import { Clock, X, Check } from 'lucide-react';
import { AdminPollItem } from '../../types';


export const PendingPollCard = ({ poll, onReject, onApprove }: { poll: AdminPollItem, onReject: (id: string) => void, onApprove: (poll: AdminPollItem) => void }) => (
  <article aria-label={poll.title} className="bg-[#1c1b1b] border border-[#353534] hover:border-[#454932] rounded-2xl p-5 flex flex-col justify-between gap-4">
    <div className="flex flex-col gap-3">
      {/* Header Info */}
      <div className="flex justify-between items-start border-b border-[#353534] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center font-bold text-xs text-[#d2f000]">
            {poll.user?.username?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <span className="font-bold text-xs text-[#e5e2e1] block">@{poll.user?.username || 'Usuario'}</span>
            <span className="text-[10px] text-[#909378]">El {new Date(poll.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" /> PENDIENTE
        </span>
      </div>
      
      {/* Poll Content */}
      <div>
        <h3 className="font-extrabold text-base text-[#e5e2e1] leading-snug">{poll.title}</h3>
        {poll.description && <p className="text-xs text-[#c6c9ab] mt-1">{poll.description}</p>}
      </div>

      {/* Options Preview */}
      <div className="flex flex-col gap-1.5 bg-[#131313] p-3 rounded-xl border border-[#353534]">
        <span className="text-[10px] font-bold uppercase text-[#909378]">Opciones ({poll.options.length}):</span>
        {poll.options.map((opt) => (
          <div key={opt.id} className="text-xs text-[#e5e2e1] bg-[#1c1b1b] px-3 py-1.5 rounded-lg border flex gap-2">
            <span className="font-mono text-[#d2f000] font-bold">#{opt.id}</span> {opt.label}
          </div>
        ))}
      </div>
    </div>

    {/* Actions */}
    <div className="pt-3 border-t border-[#353534] flex gap-2">
      <button onClick={() => onReject(poll.id)} className="flex-1 bg-[#2a2a2a] text-red-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5">
        <X className="w-4 h-4" /> Rechazar
      </button>
      <button onClick={() => onApprove(poll)} className="flex-1 bg-[#d2f000] text-[#191e00] font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5">
        <Check className="w-4 h-4" /> Aprobar
      </button>
    </div>
  </article>
);