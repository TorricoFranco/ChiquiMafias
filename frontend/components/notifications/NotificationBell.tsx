"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Coins, Calendar, ShoppingBag, AlertTriangle, Check, CheckCheck } from "lucide-react";
import { NotificationItem } from "@/services/notification";
import { useNotifications } from "@/hook/socket/useNotification";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, loading } = useNotifications();

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Al abrir el panel, marcamos las no leídas visibles como leídas automáticamente
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
      if (unreadIds.length > 0) {
        // Le damos un pequeño delay para que el usuario llegue a ver el "puntito" antes de que se borre
        setTimeout(() => markAsRead(unreadIds), 1500);
      }
    }
  }, [isOpen, notifications, unreadCount, markAsRead]);

  // Helper para renderizar iconos según el tipo de notificación
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case "BET_WON":
        return { icon: <Coins className="w-4 h-4 text-amber-400" />, bg: "bg-amber-500/10 border-amber-500/20" };
      case "BET_LOST":
        return { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, bg: "bg-red-500/10 border-red-500/20" };
      case "MATCH_STARTING":
        return { icon: <Calendar className="w-4 h-4 text-sky-400" />, bg: "bg-sky-500/10 border-sky-500/20" };
      case "STORE_NEW_CONTENT":
        return { icon: <ShoppingBag className="w-4 h-4 text-lime-400" />, bg: "bg-lime-500/10 border-lime-500/20" };
      default:
        return { icon: <Bell className="w-4 h-4 text-gray-400" />, bg: "bg-gray-500/10 border-gray-500/20" };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Icono de la campanita */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-[#2b2b2b] hover:bg-[#3b3b3b] transition border border-transparent hover:border-gray-600 text-gray-300 hover:text-white"
      >
        <Bell className="w-5 h-5" />

        {/* Badge flotante con contador */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#181818]"
            >
              {unreadCount > 9 ? "+9" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1f1f1f] border border-[#2b2b2b] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header del buzón */}
            <div className="p-4 border-b border-[#2b2b2b] flex justify-between items-center bg-[#1a1a1a]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              {notifications.some((n) => !n.readAt) && (
                <button
                  onClick={() => markAsRead(notifications.filter((n) => !n.readAt).map((n) => n.id))}
                  className="text-xs text-lime-400 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Marcar todo leído
                </button>
              )}
            </div>

            {/* Lista de alertas */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-[#2b2b2b]/50 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No tenés notificaciones pendientes.
                </div>
              ) : (
                notifications.map((notif) => {
                  const config = getNotificationConfig(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 transition-colors flex gap-3 relative ${!notif.readAt ? "bg-lime-500/[0.02] hover:bg-lime-500/[0.04]" : "hover:bg-[#252525]"
                        }`}
                    >
                      {/* Indicador lateral de no leído (Puntito) */}
                      {!notif.readAt && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-lime-400 rounded-full" />
                      )}

                      {/* Icono de Tipo */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${config.bg}`}>
                        {config.icon}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <p className={`text-xs font-bold truncate ${!notif.readAt ? "text-white" : "text-gray-400"}`}>
                            {notif.title}
                          </p>
                          {notif.isGlobal && (
                            <span className="text-[10px] bg-sky-500/10 text-sky-400 font-mono px-1 rounded uppercase tracking-tighter shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed break-words">
                          {notif.message}
                        </p>

                        {/* Renderizado especial por Metadata (Gamification / Monedas) */}
                        {notif.metadata?.coins && notif.type === "BET_WON" && (
                          <div className="mt-1.5 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded w-max">
                            <Coins className="w-3 h-3" /> +{notif.metadata.coins} monedas
                          </div>
                        )}

                        <span className="text-[10px] text-gray-600 block mt-1.5">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}