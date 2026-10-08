import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AdminReport } from '@/features/supports/types';

interface ReportCardProps {
  report: AdminReport;
  onOpenResolveModal: (report: AdminReport) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onOpenResolveModal,
}) => (
  <article
    aria-label={`Reporte contra @${report.reported.username}`}
    className="bg-[#1c1b1b] border border-[#353534] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#454932] transition-all"
  >
    <div className="flex flex-col gap-3">
      {/* Top info */}
      <div className="flex justify-between items-start border-b border-[#353534] pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
            {report.reason}
          </span>
          <span className="text-[10px] text-[#909378]">
            {new Date(report.createdAt).toLocaleString()}
          </span>
        </div>

        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
            report.status === 'PENDING'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {report.status}
        </span>
      </div>

      {/* Users involved */}
      <div className="grid grid-cols-2 gap-2 bg-[#131313] p-3 rounded-xl border border-[#353534] text-xs">
        <div>
          <span className="text-[9px] text-[#909378] font-bold uppercase block">
            Denunciante:
          </span>
          <span className="font-bold text-[#e5e2e1]">
            @{report.reporter.username}
          </span>
          <span className="text-[10px] text-[#909378] block">
            {report.reporter.email}
          </span>
        </div>
        <div className="border-l border-[#353534] pl-2">
          <span className="text-[9px] text-red-400 font-bold uppercase block">
            Denunciado:
          </span>
          <span className="font-bold text-red-300">
            @{report.reported.username}
          </span>
          <span className="text-[10px] text-[#909378] block">
            {report.reported.email}
          </span>
        </div>
      </div>

      {/* Report details */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-[#909378]">
          Motivo / Descripción de la denuncia:
        </span>
        <p className="text-xs text-[#e5e2e1] bg-[#131313] p-3 rounded-xl border border-[#353534]">
          {report.details}
        </p>
      </div>

      {/* Comment context if exists */}
      {report.comment && (
        <div className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl text-xs text-red-300">
          <span className="text-[9px] uppercase font-bold text-red-400 block mb-0.5">
            Mensaje reportado en el chat:
          </span>
          "{report.comment.text}"
        </div>
      )}

      {report.poll && (
        <div className="text-[11px] text-[#909378]">
          Encuesta vinculada: <strong className="text-[#e5e2e1]">{report.poll.title}</strong>
        </div>
      )}
    </div>

    {/* Actions */}
    <div className="pt-3 border-t border-[#353534] flex items-center justify-between">
      {report.status === 'PENDING' ? (
        <button
          onClick={() => onOpenResolveModal(report)}
          className="w-full bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black text-xs py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Resolver / Aplicar Sanción</span>
        </button>
      ) : (
        <div className="text-xs text-[#909378] flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Resuelto por @{report.resolvedBy?.username || 'Admin'}</span>
        </div>
      )}
    </div>
  </article>
);