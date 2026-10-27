import React, { useEffect, useRef } from 'react';
import { Calendar, Activity, Users, MessageSquare } from 'lucide-react';

export type MatchTabKey = 'pre-partido' | 'resumen' | 'formaciones' | 'chat';

interface MatchTabsProps {
    activeTab: MatchTabKey;
    onChangeTab: (tab: MatchTabKey) => void;
    isNotStarted: boolean;
    hasLineups: boolean;
    /** La pestaña de chat existe hasta que el partido termina. */
    showChatTab: boolean;
    chatCount?: number;
    eventsCount?: number;
}

export const MatchTabs: React.FC<MatchTabsProps> = ({
    activeTab,
    onChangeTab,
    isNotStarted,
    hasLineups,
    showChatTab,
    chatCount = 0,
    eventsCount = 0,
}) => {
    const tabRefs = useRef<Partial<Record<MatchTabKey, HTMLButtonElement | null>>>({});
    // Pestaña con foco. Si desaparece estando enfocada (el chat al terminar el
    // partido), el navegador no dispara blur y el foco cae al body.
    const focusedTab = useRef<MatchTabKey | null>(null);

    useEffect(() => {
        if (!showChatTab && focusedTab.current === 'chat') {
            focusedTab.current = activeTab;
            tabRefs.current[activeTab]?.focus();
        }
    }, [showChatTab, activeTab]);

    const tabs: { key: MatchTabKey; label: string; icon: React.ElementType }[] = [];

    if (isNotStarted) {
        tabs.push({ key: 'pre-partido', label: 'Historial', icon: Calendar });
    }

    if (hasLineups) {
        tabs.push({ key: 'formaciones', label: 'Formaciones', icon: Users });
    }

    if (!isNotStarted) {
        tabs.push({ key: 'resumen', label: 'Resumen', icon: Activity });
    }

    if (showChatTab) {
        tabs.push({ key: 'chat', label: 'Chat en Vivo', icon: MessageSquare });
    }

    // En celular las pestañas se reparten el ancho con el icono arriba del texto: con tres
    // (en vivo con formaciones) no entran en fila y la barra se deslizaba de costado.
    return (
        <div role="tablist" className="flex gap-1 sm:gap-2 pb-2 border-b border-[#2b2a2a]">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        ref={(el) => {
                            tabRefs.current[tab.key] = el;
                        }}
                        onFocus={() => {
                            focusedTab.current = tab.key;
                        }}
                        onBlur={() => {
                            focusedTab.current = null;
                        }}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChangeTab(tab.key)}
                        className={`flex-1 sm:flex-initial min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-t-xl transition-all font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer ${isActive
                                ? 'bg-[#2b2a2a] text-[#d2f000] border-b-2 border-[#d2f000]'
                                : 'text-[#8e9285] hover:text-[#c6c9ab] hover:bg-[#1c1b1b]'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};