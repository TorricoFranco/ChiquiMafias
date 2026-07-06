'use client';

import { useState } from 'react';
import { useResolveReport } from '@/hook/react-query/useAdminSupport';

interface ReportActionDrawerProps {
  report: any; // Idealmente tipado con tu interfaz Report
  onClose: () => void;
}

type ActionType = 'BAN' | 'MUTE' | 'WARN' | 'UNBAN';

export default function ReportActionDrawer({ report, onClose }: ReportActionDrawerProps) {
  const [action, setAction] = useState<ActionType>('WARN');
  const [duration, setDuration] = useState<number | ''>('');
  const [reason, setReason] = useState('');

  const resolveMutation = useResolveReport();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    resolveMutation.mutate(
      {
        reportId: report.id,
        data: {
          action,
          durationHours: duration ? Number(duration) : undefined,
          reason,
        },
      },
      {
        onSuccess: () => {
          onClose(); // Cerramos el panel si todo salió bien
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-fade-in-left overflow-y-auto">
        
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-red-50">
          <div>
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Auditoría de Reporte</span>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">ID: {report.id.slice(0,8)}...</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-red-100">
            ✕
          </button>
        </div>

        {/* Detalles del Reporte */}
        <div className="p-6 space-y-4 bg-gray-50 flex-1">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Información del Reporte</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-gray-400">Reportante</span>
                <span className="font-medium text-gray-900">{report.reporter?.username || report.reporterId}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400">Reportado</span>
                <span className="font-bold text-red-600">{report.reported?.username || report.reportedId}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs text-gray-400">Motivo (Categoría)</span>
                <span className="font-medium">{report.reason}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <span className="block text-xs text-gray-400 mb-1">Detalles provistos por el reportante:</span>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.details}</p>
          </div>
        </div>

        {/* Formulario de Acción (Solo si está PENDING) */}
        <div className="p-6 border-t border-gray-200 bg-white">
          {report.status !== 'PENDING' ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <span className="text-green-800 font-semibold block mb-1">Este reporte ya fue resuelto</span>
              <span className="text-sm text-green-600">No se pueden aplicar más acciones desde acá.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Aplicar Sanción</h3>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Acción Disciplinaria</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as ActionType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="WARN">Aviso (Warning)</option>
                  <option value="MUTE">Mutear (Silenciar Chat)</option>
                  <option value="BAN">Banear (Bloquear Cuenta)</option>
                </select>
              </div>

              {(action === 'MUTE' || action === 'BAN') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duración (Horas)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 24 (Dejar vacío para permanente)"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Razón (Interna / Para el usuario)</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Justificación de la sanción..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={resolveMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {resolveMutation.isPending ? 'Procesando...' : 'Confirmar y Sancionar'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}