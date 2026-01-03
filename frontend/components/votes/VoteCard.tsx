import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { POLL_ICONS } from "@/constants/poll-icons";

interface VoteCardProps {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  endsAt: string;
}

export function VoteCard({ id, title, description, iconKey, endsAt }: VoteCardProps) {
  const icon = POLL_ICONS[iconKey] || POLL_ICONS.USER;

  return (
    <div className="flex-shrink-0 w-64 p-4 bg-[#1f1f1f] rounded-xl border border-[#2b2b2b] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>{icon}</div>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {new Date(endsAt) > new Date() ? "Activa" : "Finalizada"}
        </span>
      </div>
      
      <div className="mb-4">
        <p className="text-base font-semibold text-white truncate">{title}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{description}</p>
      </div>

      <Link 
        href={`/vote/${id}`}
        className="text-xs text-gray-300 flex items-center justify-center bg-[#2b2b2b] hover:bg-[#363636] transition-colors w-full py-2 rounded-lg"
      >
        Ver votación <ChevronRight className="w-3 h-3 ml-1" />
      </Link>
    </div>
  );
}