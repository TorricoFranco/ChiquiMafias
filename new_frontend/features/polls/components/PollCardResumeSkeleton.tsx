import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/** Mismas medidas que PollCardResume, para que el carrusel no salte al llegar los datos. */
export const PollCardResumeSkeleton: React.FC = () => (
    <div className="bg-[#1c1b1b] border border-[#353534] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex flex-col gap-2">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
        </div>
        <div className="flex justify-between items-center mt-1 pt-2 border-t border-[#353534]/60">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
        </div>
    </div>
);
