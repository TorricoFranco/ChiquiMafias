import React from 'react';
import { Calendar, Activity, Users, MessageSquare } from 'lucide-react';

export type MatchTabKey = 'pre-partido' | 'resumen' | 'formaciones' | 'chat';

interface MatchTabsProps {
    activeTab: MatchTabKey;
    onChangeTab: (tab: MatchTabKey) => void;
    isNotStarted: boolean;
    hasLineups: boolean;
    isFinished: boolean;
    chatCount?: number;
    eventsCount?: number;
}

export const MatchTabs: React.FC<MatchTabsProps> = ({
    activeTab,
    onChangeTab,
    isNotStarted,
    hasLineups,
    isFinished,
    chatCount = 0,
    eventsCount = 0,
}) => {
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

    if (!isFinished) {
        tabs.push({ key: 'chat', label: 'Chat en Vivo', icon: MessageSquare });
    }

    return (
        <div role="tablist" className="flex gap-2 overflow-x-auto pb-2 border-b border-[#2b2a2a] scrollbar-hide">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChangeTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition-all font-bold text-sm whitespace-nowrap cursor-pointer ${isActive
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