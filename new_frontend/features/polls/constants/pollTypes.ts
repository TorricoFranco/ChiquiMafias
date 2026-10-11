import { MatchLayout, PollType } from "@/features/polls/types";

interface PollTypeMeta {
    /** Texto del chip en el header de la tarjeta. */
    chipLabel: string;
    /** Clases del chip. */
    chipClass: string;
    /** Acento del contenedor de la tarjeta. */
    cardClass: string;
    /** Si la encuesta se vota (las placas informativas no). */
    votable: boolean;
    /** Nombre del tipo en los selectores de creación. */
    name: string;
    /** Tickets que cuesta proponerla (el costo real lo recalcula el backend). */
    ticketCost: number;
    /** Si se puede proponer desde el modal del usuario. */
    proposable: boolean;
    /** Texto del footer cuando la encuesta no se vota. */
    footerNote?: string;
}

const NEUTRAL_CHIP = "bg-[#2a2a2a] text-[#c6c9ab]";
const HOT_CHIP = "bg-[#2a2a2a] text-[#d2f000]";
const OFFICIAL_CHIP = "bg-[#d2f000] text-[#191e00]";

const DEFAULT_CARD = "border-[#353534] hover:border-[#454932]";
const OFFICIAL_CARD = "border-[#353534] hover:border-[#454932] border-l-4 border-l-[#d2f000]";

export const POLL_TYPE_META: Record<PollType, PollTypeMeta> = {
    CLASSIC: {
        chipLabel: "ENCUESTA",
        chipClass: NEUTRAL_CHIP,
        cardClass: DEFAULT_CARD,
        votable: true,
        name: "Clásica",
        ticketCost: 1,
        proposable: true,
    },
    VERSUS: {
        chipLabel: "DUELO",
        chipClass: HOT_CHIP,
        cardClass: DEFAULT_CARD,
        votable: true,
        name: "Duelo 1 vs 1",
        ticketCost: 1,
        proposable: true,
    },
    MATCH: {
        chipLabel: "PREDICCIÓN",
        chipClass: HOT_CHIP,
        cardClass: DEFAULT_CARD,
        votable: true,
        name: "Predicción de partido",
        ticketCost: 2,
        proposable: true,
    },
    RATING: {
        chipLabel: "PUNTUACIÓN",
        chipClass: NEUTRAL_CHIP,
        cardClass: DEFAULT_CARD,
        votable: true,
        name: "Puntuación",
        ticketCost: 1,
        proposable: false,
    },
    RANKING: {
        chipLabel: "RANKING",
        chipClass: NEUTRAL_CHIP,
        cardClass: DEFAULT_CARD,
        votable: true,
        name: "Ranking",
        ticketCost: 3,
        proposable: false,
    },
    FACTO: {
        chipLabel: "DEBATE",
        chipClass: HOT_CHIP,
        cardClass: DEFAULT_CARD,
        votable: true,
        name: "Facto o no facto",
        ticketCost: 1,
        proposable: true,
    },
    NEWS: {
        chipLabel: "NOTICIA",
        chipClass: OFFICIAL_CHIP,
        cardClass: OFFICIAL_CARD,
        votable: true,
        name: "Noticia",
        ticketCost: 1,
        proposable: false,
    },
    INFO: {
        chipLabel: "INFO",
        chipClass: OFFICIAL_CHIP,
        cardClass: OFFICIAL_CARD,
        votable: false,
        name: "Informativa",
        ticketCost: 1,
        proposable: false,
        footerNote: "Aviso de la tribuna",
    },
};

/** Meta del tipo, con fallback a CLASSIC para un tipo que el front todavía no conoce. */
export const getPollTypeMeta = (type?: PollType): PollTypeMeta =>
    (type && POLL_TYPE_META[type]) || POLL_TYPE_META.CLASSIC;

/** Tipos que el usuario puede proponer, en el orden del selector. */
export const PROPOSABLE_POLL_TYPES: PollType[] = (
    Object.keys(POLL_TYPE_META) as PollType[]
).filter((type) => POLL_TYPE_META[type].proposable);

export interface PollFilterGroup {
    id: string;
    label: string;
    /** `null` = sin filtrar. */
    types: PollType[] | null;
}

/** Grupos del filtro del feed, para que cada familia de encuestas se pueda aislar. */
export const POLL_FILTER_GROUPS: PollFilterGroup[] = [
    { id: "todas", label: "Todas", types: null },
    { id: "encuestas", label: "Encuestas", types: ["CLASSIC", "RATING", "RANKING"] },
    { id: "duelos", label: "Duelos", types: ["VERSUS", "MATCH"] },
    { id: "debate", label: "Debate", types: ["FACTO"] },
    { id: "noticias", label: "Noticias", types: ["NEWS", "INFO"] },
];

export interface PollUiRules {
    minOptions: number;
    maxOptions: number;
    badges: "none" | "optional" | "required";
    requiresEndsAt: boolean;
}

/**
 * Reglas de formulario por tipo. Son el espejo de `POLL_TYPE_RULES` del backend
 * (`backend/src/polls/constants/poll-types.constant.ts`), que valida lo mismo.
 */
export const getPollUiRules = (type: PollType, layout: MatchLayout = "VS"): PollUiRules => {
    const requiresEndsAt = type !== "NEWS" && type !== "INFO";

    if (type === "FACTO" || type === "RATING" || type === "INFO") {
        return { minOptions: 0, maxOptions: 0, badges: "none", requiresEndsAt };
    }

    if (type === "VERSUS") {
        return { minOptions: 2, maxOptions: 2, badges: "optional", requiresEndsAt };
    }

    if (type === "MATCH") {
        return layout === "VS"
            ? { minOptions: 2, maxOptions: 2, badges: "required", requiresEndsAt }
            : { minOptions: 2, maxOptions: 6, badges: "optional", requiresEndsAt };
    }

    if (type === "RANKING") {
        return { minOptions: 3, maxOptions: 6, badges: "optional", requiresEndsAt };
    }

    return { minOptions: 2, maxOptions: 6, badges: "none", requiresEndsAt };
};
