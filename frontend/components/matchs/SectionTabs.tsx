"use client";

import { ElementType } from "react";

// 1. Definimos la estructura de cada pestaña
interface Tab {
    id: string;
    label: string;
    icon: ElementType; // ElementType permite usar cualquier componente de icono
}

// 2. Definimos los props del componente
interface SectionTabsProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    tabs: Tab[];
}

export const SectionTabs = ({ activeTab, setActiveTab, tabs }: SectionTabsProps) => {
    return (
        <div className="flex border-b border-gray-700 mb-0 overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-semibold transition-colors duration-200 flex items-center justify-center space-x-2
            ${activeTab === tab.id
                            ? "text-sky-400 border-b-2 border-sky-400 bg-gray-700/30"
                            : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                        }`}
                >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};