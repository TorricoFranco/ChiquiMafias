'use client';

import { useState } from 'react';
import { useAdminReports } from '@/hook/react-query/useAdminSupport';
import ReportActionDrawer from './ReportActionDrawer';

export default function ReportsTable() {
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  
  const { data: reports, isLoading, isError } = useAdminReports();

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando reportes...</div>;
  if (isError) return <div className="p-4 text-red-500 text-center">Error al cargar los reportes.</div>;

  return (
    <div className="relative">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 border-b">Reportado</th>
              <th className="px-6 py-3 border-b">Reportante</th>
              <th className="px-6 py-3 border-b">Motivo</th>
              <th className="px-6 py-3 border-b">Estado</th>
              <th className="px-6 py-3 border-b">Fecha</th>
              <th className="px-6 py-3 border-b text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {reports?.map((report: any) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-red-600">
                  {report.reported?.username || report.reportedId}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {report.reporter?.username || report.reporterId}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold">
                    {report.reason}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                    ${report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                      report.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4">{new Date(report.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedReport(report)} 
                    className="text-blue-600 hover:text-blue-900 font-semibold text-sm transition-colors"
                  >
                    Auditar
                  </button>
                </td>
              </tr>
            ))}
            
            {reports?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay reportes en el sistema. ¡Todo tranquilo!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* COMPONENTE DRAWER PARA SANCIONAR */}
      {selectedReport && (
        <ReportActionDrawer 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
}