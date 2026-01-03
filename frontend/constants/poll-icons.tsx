import {
  User,
  Zap,
  TrendingUp,
  Users,
  ChevronRight,
  Trophy,
  Wallet,
  DollarSign,
} from "lucide-react";

export const POLL_ICONS: Record<string, React.ReactNode> = {
  USER: <User className="w-6 h-6 text-lime-400" />,
  ZAP: <Zap className="w-6 h-6 text-sky-400" />,
  TRENDING: <TrendingUp className="w-6 h-6 text-yellow-400" />,
  USERS: <Users className="w-6 h-6 text-red-400" />,
  CHEVRON: <ChevronRight className="w-6 h-6 text-orange-400" />,
  TROPHY: <Trophy className="w-6 h-6 text-pink-400" />,
  
  WALLET: <Wallet className="w-6 h-6 text-green-500" />,
  DOLLAR: <DollarSign className="w-6 h-6 text-emerald-400" />,
};
