import {
  Coins,
  Calendar,
  ShoppingBag,
  AlertTriangle,
  Bell,
} from "lucide-react";

export const getNotificationConfig = (type: string) => {
  switch (type) {
    case "BET_WON":
      return {
        icon: <Coins className="w-4 h-4 text-amber-400" />,
        bg: "bg-amber-500/10 border-amber-500/20",
      };

    case "BET_LOST":
      return {
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
        bg: "bg-red-500/10 border-red-500/20",
      };

    case "MATCH_STARTING":
      return {
        icon: <Calendar className="w-4 h-4 text-sky-400" />,
        bg: "bg-sky-500/10 border-sky-500/20",
      };

    case "STORE_NEW_CONTENT":
      return {
        icon: <ShoppingBag className="w-4 h-4 text-lime-400" />,
        bg: "bg-lime-500/10 border-lime-500/20",
      };

    default:
      return {
        icon: <Bell className="w-4 h-4 text-gray-400" />,
        bg: "bg-gray-500/10 border-gray-500/20",
      };
  }
};