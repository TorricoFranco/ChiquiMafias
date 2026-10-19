import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/** Misma forma que PollCard (cabecera, título, opciones y pie) para que la lista no salte al llegar los datos. */
export const PollCardSkeleton: React.FC = () => (
    <div className="bg-[#1c1b1b] border border-[#353534] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-16" />
            </div>
        </div>
        <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
        </div>
        <div className="flex flex-col gap-2">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-[#353534]/60">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
        </div>
    </div>
);
