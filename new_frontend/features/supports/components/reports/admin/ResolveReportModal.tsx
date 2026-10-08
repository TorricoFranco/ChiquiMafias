import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  VolumeX,
  UserX,
  Check,
  X,
} from 'lucide-react';
import { AdminReport } from '@/features/supports/types';


interface ResolveReportModalProps {
  report: AdminReport;
  onClose: () => void;
  onResolveReport: (
    reportId: string,
    action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN',
    reason: string,
    muteHours?: number
  ) => void;
}

export const ResolveReportModal: React.FC<ResolveReportModalProps> = ({
  report,
  onClose,
  onResolveReport,
}) => {
  const [resolveAction, setResolveAction] = useState<
    'BAN' | 'MUTE' | 'WARN' | 'UNBAN'
  >('WARN');
  const [resolveReason, setResolveReason] = useState(
    'Violación a los términos de convivencia'
  );
  const [resolveMuteHours, setResolveMuteHours] = useState(24);

  // El padre cierra el modal cuando el backend confirma: si falla, la sanción queda cargada.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResolveReport(
      report.id,
      resolveAction,
      resolveReason,
      resolveAction === 'MUTE' ? resolveMuteHours : undefined
    );
  };

  const actions = [
    { id: 'WARN', label: 'Advertencia (WARN)', icon: AlertTriangle },
    { id: 'MUTE', label: 'Silenciar Chat (MUTE)', icon: VolumeX },
    { id: 'BAN', label: 'Banear Cuenta (BAN)', icon: UserX },
    { id: 'UNBAN', label: 'Desestimar / Unban', icon: Check },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-report-title"
        className="relative bg-[#1c1b1b] border border-red-500/50 rounded-2xl max-w-md w-full p-6 z-10 shadow-2xl animate-in zoom-in-95"
      >
        <div className="flex justify-between items-center border-b border-[#353534] pb-3 mb-4">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 id="resolve-report-title" className="font-extrabold text-base text-[#e5e2e1] uppercase">
              Resolver Denuncia & Sancionar
            </h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#c6c9ab] hover:text-[#e5e2e1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-[#131313] p-3 rounded-xl border border-[#353534]">
            <span className="text-[10px] text-[#909378] font-bold uppercase">
              Usuario a sancionar:
            </span>
            <p className="font-black text-sm text-red-400">
              @{report.reported.username} ({report.reported.email})
            </p>
            <span className="text-[11px] text-[#c6c9ab] block mt-1">
              Motivo: {report.reason}
            </span>
          </div>

          <div>
            <span id="resolve-report-action" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-2">
              Acción a ejecutar *
            </span>
            <div role="group" aria-labelledby="resolve-report-action" className="grid grid-cols-2 gap-2">
              {actions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    type="button"
                    aria-pressed={resolveAction === act.id}
                    onClick={() => setResolveAction(act.id as any)}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      resolveAction === act.id
                        ? 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-[#131313] border-[#353534] text-[#c6c9ab]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {resolveAction === 'MUTE' && (
            <div>
              <label htmlFor="resolve-report-mute-hours" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">
                Duración del Mute (Horas):
              </label>
              <select
                id="resolve-report-mute-hours"
                value={resolveMuteHours}
                onChange={(e) => setResolveMuteHours(Number(e.target.value))}
                className="w-full bg-[#131313] border border-[#353534] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none"
              >
                <option value={1}>1 Hora</option>
                <option value={6}>6 Horas</option>
                <option value={24}>24 Horas (1 Día)</option>
                <option value={72}>72 Horas (3 Días)</option>
                <option value={168}>168 Horas (1 Semana)</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="resolve-report-reason" className="block text-[10px] font-bold uppercase text-[#c6c9ab] mb-1">
              Justificación / Razón enviada al usuario *
            </label>
            <textarea
              id="resolve-report-reason"
              rows={2}
              required
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
              className="w-full bg-[#131313] border border-[#353534] focus:border-red-500 text-xs text-[#e5e2e1] px-3 py-2 rounded-xl outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#353534]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#c6c9ab] hover:text-[#e5e2e1] px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-600 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Aplicar Sanción</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};