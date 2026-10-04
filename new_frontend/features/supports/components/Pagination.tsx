import React from 'react';

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    onPageChange: (newPage: number) => void;
    isFetching?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({ 
    currentPage, 
    lastPage, 
    onPageChange,
    isFetching = false
}) => {
    if (lastPage <= 1) return null;

    return (
        <div className="flex items-center justify-between bg-[#171717] p-3 rounded-xl border border-[#353534] mt-4">
            <button
                disabled={currentPage === 1 || isFetching}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-4 py-1.5 bg-[#2a2a29] text-[#c6c9ab] text-xs font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#353534] transition-colors"
            >
                ← Anterior
            </button>

            <span className="text-[#e5e2e1] text-xs font-bold font-mono flex items-center gap-2">
                Pág {currentPage} de {lastPage}
                {isFetching && <span className="w-2 h-2 bg-[#d2f000] rounded-full animate-pulse" />}
            </span>

            <button
                disabled={currentPage === lastPage || isFetching}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-4 py-1.5 bg-[#2a2a29] text-[#c6c9ab] text-xs font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#353534] transition-colors"
            >
                Siguiente →
            </button>
        </div>
    );
};