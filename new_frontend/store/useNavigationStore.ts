import { create } from 'zustand';

type StoreSubTab = 'suscripciones' | 'coins' | 'cosmeticos';

/** Encuesta a la que el feed de Comunidad tiene que llevar al entrar. */
interface FocusedPoll {
    id: string;
    /** `true` si además hay que abrir sus comentarios (botón Comentar). */
    openComments: boolean;
}

/** Cuánto dura el resalte de la encuesta llevada desde el carrusel o el chat. */
const FOCUS_DURATION_MS = 2000;
/** Cuánto espera el enfoque a que la encuesta aparezca en el feed antes de descartarse. */
const FOCUS_WAIT_MS = 10_000;

/**
 * Timer del enfoque en curso. Vive en el store, no en el componente: si el feed se desmonta antes,
 * el enfoque igual se apaga y no queda una encuesta resaltada para la próxima vez.
 */
let focusTimer: ReturnType<typeof setTimeout> | undefined;

interface NavigationState {
    activeTab: string;
    storeSubTab: StoreSubTab;
    focusedPoll: FocusedPoll | null;
    setActiveTab: (tab: string, subTab?: StoreSubTab) => void;
    setStoreSubTab: (subTab: StoreSubTab) => void;
    /** Va a Comunidad y enfoca esa encuesta. Se descarta solo si nunca aparece o cuando termina el resalte. */
    openPollInFeed: (pollId: string, openComments: boolean) => void;
    /** La encuesta ya está en pantalla y recibió el foco: recién ahí arranca el reloj del resalte. */
    markFocusApplied: () => void;
    clearFocusedPoll: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => {
    const clearFocusAfter = (focus: FocusedPoll, delayMs: number) => {
        clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
            set((state) => (state.focusedPoll === focus ? { focusedPoll: null } : state));
        }, delayMs);
    };

    return {
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
            set({ activeTab: "Comunidad", focusedPoll: focus });
            clearFocusAfter(focus, FOCUS_WAIT_MS);
        },
        markFocusApplied: () => {
            const focus = get().focusedPoll;
            if (focus) clearFocusAfter(focus, FOCUS_DURATION_MS);
        },
        clearFocusedPoll: () => set({ focusedPoll: null }),
    };
});
