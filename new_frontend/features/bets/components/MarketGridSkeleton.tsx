import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/** Misma forma y medidas que una MarketCard del grid, para que la lista no salte al llegar los datos. */
const MarketGridCardSkeleton: React.FC = () => (
    <div className="flex flex-col gap-3.5 bg-[#1c1b1b] border border-[#353534] rounded-xl p-4">
        <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-[84px] rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-24" />
    </div>
);

/**
 * Grid de Apuestas mientras cargan los mercados. El texto accesible no coincide con el del carrusel
 * ("Cargando mercados") para que ninguno de los dos locators encuentre dos elementos.
 */
export const MarketGridSkeleton: React.FC = () => (
    <div role="status" className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        <span className="sr-only">Cargando apuestas</span>
        {Array.from({ length: 4 }, (_, index) => (
            <MarketGridCardSkeleton key={index} />
        ))}
    </div>
);
