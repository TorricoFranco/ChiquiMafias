import { ChevronRight, User, LogOut, Settings, ShoppingBag, Palette, Crown, Loader2, XCircle, LifeBuoy } from "lucide-react";
import { useSubscriptions } from "@/hook/react-query/useSubcriptions";

interface UserMenuDropdownProps {
  username: string;
  team: any;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | null | string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenStore: () => void;
  onOpenCustomizer: () => void;
  onOpenSupport: () => void; // <-- Nueva prop agregada
}

// 👑 Mapeamos las llaves exactas de tu Backend. Usamos 'FREE' como fallback interno para el objeto.
const TIER_CONFIG = {
  TIER_3: {
    name: "Socio Oro (Tier 3)",
    avatarStyles: "border-2 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.5)] bg-gradient-to-b from-yellow-500 to-amber-600",
    badgeStyles: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    hasCrown: true,
    crownColor: "text-yellow-400 fill-yellow-400",
  },
  TIER_2: {
    name: "Socio Platino (Tier 2)",
    avatarStyles: "border-2 border-slate-400 bg-gradient-to-b from-slate-600 to-slate-800",
    badgeStyles: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    hasCrown: true,
    crownColor: "text-slate-400 fill-slate-400",
  },
  TIER_1: {
    name: "Socio Bronce (Tier 1)",
    avatarStyles: "border-2 border-amber-600 bg-gradient-to-b from-amber-700 to-orange-900",
    badgeStyles: "bg-amber-600/10 text-amber-500 border-amber-600/20",
    hasCrown: false,
    crownColor: "",
  },
  FREE: {
    name: "Hincha Estándar",
    avatarStyles: "bg-lime-400",
    badgeStyles: "",
    hasCrown: false,
    crownColor: "",
  },
};

export default function UserMenuDropdown({
  username,
  team,
  tier,
  isOpen,
  setIsOpen,
  onLogout,
  onOpenProfile,
  onOpenStore,
  onOpenCustomizer,
  onOpenSupport,
}: UserMenuDropdownProps) {

  const { cancelSubscription, isCanceling, currentSub } = useSubscriptions();

  // Si tier es null, agarramos la configuración de FREE
  const currentTierInfo = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.FREE;

  const handleCancel = () => {
    if (window.confirm("¿Estás seguro de que querés cancelar la renovación automática? Mantendrás tus beneficios hasta el vencimiento.")) {
      cancelSubscription("Cancelado desde el menú de usuario");
    }
  };

  

  return (
    <div className="relative">
      {/* Gatillo del Dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 cursor-pointer p-1.5 pl-3 rounded-full bg-[#2b2b2b] hover:bg-[#3b3b3b] transition border border-transparent hover:border-gray-600"
      >
        <span className="text-sm text-white font-medium hidden md:block">{username}</span>

        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${currentTierInfo.avatarStyles}`}>
          {team?.badgeUrl ? (
            <img src={team.badgeUrl} alt="Escudo" className="w-5 h-5 object-contain" />
          ) : (
            <User className={`w-4 h-4 ${tier ? 'text-white' : 'text-black'}`} />
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-200">
          <div className="px-4 py-3 border-b border-[#2b2b2b]">
            <p className="text-xs text-gray-400">Usuario</p>

            <div className="flex items-center space-x-1.5 truncate">
              <p className="text-sm font-bold text-white truncate">{username}</p>
              {currentTierInfo.hasCrown && (
                <Crown className={`w-4 h-4 flex-shrink-0 ${currentTierInfo.crownColor}`} />
              )}
            </div>

            {/* Etiqueta del Tier / Botón para asociarse si es null */}
            <div className="mt-2">
              {tier ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${currentTierInfo.badgeStyles}`}>
                  {currentTierInfo.name}
                </span>
              ) : (
                <button
                  onClick={() => { setIsOpen(false); onOpenStore(); }}
                  className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 animate-pulse hover:underline block text-left"
                >
                  Asociate al Club Chiqui ⚡
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 mt-2 border-t border-[#2b2b2b]/50 pt-2">
              {team?.badgeUrl && <img src={team.badgeUrl} alt="Escudo" className="w-4 h-4 object-contain" />}
              <p className="text-xs text-lime-400 font-mono uppercase tracking-tighter truncate">
                {team?.name || "Sin Equipo"}
              </p>
            </div>
          </div>

          {/* Opciones */}
          <div className="p-1 space-y-0.5">
            <button
              onClick={() => { setIsOpen(false); onOpenProfile(); }}
              className="flex w-full items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2b2b2b] rounded-lg transition text-left"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={() => { setIsOpen(false); onOpenStore(); }}
              className="flex w-full items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2b2b2b] rounded-lg transition text-left group"
            >
              <ShoppingBag className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-amber-400">Mercado Tribuna</span>
            </button>

            <button
              onClick={() => { setIsOpen(false); onOpenCustomizer(); }}
              className="flex w-full items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2b2b2b] rounded-lg transition text-left group"
            >
              <Palette className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
              <span>Personalizar Chat</span>
            </button>

            {/* 🚨 EL BOTÓN SE MUESTRA SOLO SI TIENE UN TIER ACTIVO Y EN MERCADO PAGO FIGURA ACTIVE */}
            {tier !== null && currentSub?.status === 'ACTIVE' && (
              <button
                onClick={handleCancel}
                disabled={isCanceling}
                className="flex w-full items-center space-x-3 px-3 py-2 text-sm text-amber-600/80 hover:bg-amber-500/5 rounded-lg transition text-left disabled:opacity-50"
              >
                {isCanceling ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-600" />
                )}
                <span>Cancelar Renovación</span>
              </button>
            )}

            {/* ---> BOTÓN DE SOPORTE <--- */}
            <button
              onClick={() => { setIsOpen(false); onOpenSupport(); }}
              className="flex w-full items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2b2b2b] rounded-lg transition text-left group"
            >
              <LifeBuoy className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Soporte y Reclamos</span>
            </button>

            <div className="border-t border-[#2b2b2b] my-1" />

            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="flex w-full items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}