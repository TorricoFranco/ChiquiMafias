import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/** Mismas medidas que MarketCard en modo carrusel, para que el carrusel no salte al llegar los datos. */
export const MarketCardSkeleton: React.FC = () => (
    <div className="flex flex-col gap-3.5 w-full">
        <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-14" />
        </div>
        <div className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-16 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
        </div>
    </div>
);
