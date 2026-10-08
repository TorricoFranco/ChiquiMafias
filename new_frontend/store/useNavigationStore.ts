import { create } from 'zustand';

type StoreSubTab = 'suscripciones' | 'coins' | 'cosmeticos';

interface NavigationState {
    activeTab: string;
    storeSubTab: StoreSubTab;
    setActiveTab: (tab: string, subTab?: StoreSubTab) => void;
    setStoreSubTab: (subTab: StoreSubTab) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    activeTab: "Chat",
    storeSubTab: "suscripciones",
    setActiveTab: (tab, subTab) =>
        set((state) => ({
            activeTab: tab,
            storeSubTab: subTab ?? state.storeSubTab
        })),
    setStoreSubTab: (subTab) => set({ storeSubTab: subTab }),
}));