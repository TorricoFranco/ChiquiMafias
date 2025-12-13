"Use client";

import { Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';


export const SectionMatchLeague = ({league}: {league: string}) => {
    return (
        <Link href={`/league/${league}`} >
                <div className="flex items-center text-lg font-bold text-gray-400 mb-4 hover:text-sky-400 transition cursor-pointer">
            <Trophy className="w-5 h-5 mr-2 text-sky-400" />
            {league}
            <ChevronRight className="w-4 h-4 ml-1" />
        </div>
        </Link>
    )
}



