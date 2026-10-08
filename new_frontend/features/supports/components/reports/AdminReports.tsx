import React, { useState } from 'react';
import { toast } from 'sonner';
import { AdminReport } from '../../types';
import { ReportFilters } from './admin/ReportFilters';
import { ReportCard } from './admin/ReportCard';
import { ResolveReportModal } from './admin/ResolveReportModal';
import { Pagination } from '../Pagination';

import { useAdminReports, useAdminResolveReport } from '../../hooks/useSupports';

export const AdminReports: React.FC = () => {
    const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');
    const [reportReasonFilter, setReportReasonFilter] = useState<string>('ALL');
    const [resolveModalReport, setResolveModalReport] = useState<AdminReport | null>(null);

    const [page, setPage] = useState(1);
    const LIMIT = 10;


    const apiStatus = reportStatusFilter === 'ALL' ? undefined : reportStatusFilter;

    const { data: response, isLoading, isFetching } = useAdminReports(page, LIMIT, apiStatus as any);

    const reports = response?.data || [];
    const meta = response?.meta;

    const { mutate: resolveReport } = useAdminResolveReport();

    const filteredReports = reports.filter((r: AdminReport) => {
        if (reportReasonFilter !== 'ALL' && r.reason !== reportReasonFilter) return false;
        return true;
    });

    const handleResolveReport = (
        reportId: string,
        action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN',
        reason: string,
        muteHours?: number
    ) => {
        resolveReport(
            {
                reportId,
                data: {
                    action,
                    reason,
                    durationHours: muteHours, 
                },
            },
            {
                onSuccess: () => {
                    setResolveModalReport(null);
                },
                onError: (error: any) => {
                    toast.error(error.message || 'No se pudo resolver el reporte');
                },
            }
        );
    };

    if (isLoading && page === 1) {
        return <div className="flex justify-center items-center h-64 text-[#d2f000]">Cargando reportes...</div>;
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <ReportFilters
                    statusFilter={reportStatusFilter}
                    onStatusFilterChange={(newStatus) => {
                        setReportStatusFilter(newStatus);
                        setPage(1);
                    }}
                    reasonFilter={reportReasonFilter}
                    onReasonFilterChange={(newReason) => {
                        setReportReasonFilter(newReason);
                        setPage(1);
                    }}
                />

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                    {filteredReports.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 bg-[#1c1b1b] border border-[#353534] rounded-2xl p-8 text-center text-xs text-[#c6c9ab]">
                            No se encontraron reportes.
                        </div>
                    ) : (
                        filteredReports.map((report: AdminReport) => (
                            <ReportCard key={report.id} report={report} onOpenResolveModal={setResolveModalReport} />
                        ))
                    )}
                </div>

                {meta && (
                    <Pagination
                        currentPage={meta.page}
                        lastPage={meta.lastPage}
                        onPageChange={setPage}
                        isFetching={isFetching}
                    />
                )}
            </div>

            {resolveModalReport && (
                <ResolveReportModal report={resolveModalReport} onClose={() => setResolveModalReport(null)} onResolveReport={handleResolveReport} />
            )}
        </>
    );
};