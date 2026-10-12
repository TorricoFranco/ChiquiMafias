import { create } from 'zustand';

type StoreSubTab = 'suscripciones' | 'coins' | 'cosmeticos';

/** Encuesta a la que el feed de Pronósticos tiene que llevar al entrar. */
interface FocusedPoll {
    id: string;
    /** `true` si además hay que abrir sus comentarios (botón Comentar). */
    openComments: boolean;
}

/** Cuánto dura el resalte de la encuesta llevada desde el carrusel. */
const FOCUS_DURATION_MS = 2000;

interface NavigationState {
    activeTab: string;
    storeSubTab: StoreSubTab;
    focusedPoll: FocusedPoll | null;
    setActiveTab: (tab: string, subTab?: StoreSubTab) => void;
    setStoreSubTab: (subTab: StoreSubTab) => void;
    /** Va a Pronósticos y enfoca esa encuesta. El enfoque se apaga solo al rato. */
    openPollInFeed: (pollId: string, openComments: boolean) => void;
    clearFocusedPoll: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    activeTab: "Chat",
    storeSubTab: "suscripciones",
    focusedPoll: null,
    setActiveTab: (tab, subTab) =>
        set((state) => ({
            activeTab: tab,
            storeSubTab: subTab ?? state.storeSubTab
        })),
    setStoreSubTab: (subTab) => set({ storeSubTab: subTab }),
    openPollInFeed: (pollId, openComments) => {
        // Cada llamada crea un objeto nuevo, así que enfoca aunque sea la misma encuesta.
        const focus: FocusedPoll = { id: pollId, openComments };
        set({ activeTab: "Pronósticos", focusedPoll: focus });

        // El timer vive en el store, no en el componente: si el feed se desmonta antes,
        // el enfoque igual se apaga y no queda una encuesta resaltada para la próxima vez.
        setTimeout(() => {
            set((state) => (state.focusedPoll === focus ? { focusedPoll: null } : state));
        }, FOCUS_DURATION_MS);
    },
    clearFocusedPoll: () => set({ focusedPoll: null }),
}));
