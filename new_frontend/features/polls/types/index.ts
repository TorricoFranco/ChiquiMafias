import type { SubscriptionTier } from "@/types/user";

export interface PollOption {
  id: number;
  label: string;
  votes: number;
  /** api_team_id del escudo de la opción; el path se arma en TeamBadge. */
  teamId?: string;
}

export type PollStatus = 'PENDING' | 'ACTIVE' | 'CLOSED' | 'REJECTED';

export type PollType =
  | 'CLASSIC'
  | 'VERSUS'
  | 'MATCH'
  | 'RATING'
  | 'RANKING'
  | 'FACTO'
  | 'NEWS'
  | 'INFO';

/** Formato del tipo MATCH: tarjeta de partido o pregunta con escudos. */
export type MatchLayout = 'VS' | 'LIST';

export interface PollConfig {
  layout?: MatchLayout;
  picks?: number;
  scale?: number;
}

/**
 * Config que acepta el backend al crear o proponer: `picks` y `scale` los
 * define el servidor, y mandarlos da 400 por `forbidNonWhitelisted`.
 */
export type PollConfigInput = Pick<PollConfig, 'layout'>;

/**
 * Veces que cada opción quedó en cada lugar del podio. La clave es el id de la
 * opción y el array tiene una posición por lugar: el índice 0 son los primeros
 * puestos, el 1 los segundos, y así.
 */
export type PollRankingResults = Record<string, number[]>;

/**
 * Autor de una encuesta de la comunidad, tal como lo manda `pollAuthorSelect`
 * del backend. En una encuesta oficial llega `null`: la moderación no se expone.
 */
export interface PollAuthor {
  id: string;
  name: string;
  username: string | null;
  /** El backend nunca manda `NONE`: sin suscripción es `null`. */
  activeSubscriptionTier: Exclude<SubscriptionTier, "NONE"> | null;
  activeNameColorId?: string | null;
  team?: {
    id: string;
    name: string;
    badgeUrl: string;
  } | null;
}

/** Moderador que publicó una encuesta oficial. Solo llega en el panel de moderación. */
export interface PollAdmin {
  id: string;
  name: string;
  username: string | null;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: PollOption[];
  status: PollStatus;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  icon: string;
  type: PollType;
  config?: PollConfig | null;
  commentsEnabled?: boolean;
  /** `true` si la publicó la moderación; `false` si la propuso un usuario con un Ticket de Encuesta. */
  isOfficial: boolean;
  userId?: string | null;
  user?: PollAuthor | null;
  /** Solo para la moderación: quién publicó la encuesta oficial. */
  createdByAdmin?: PollAdmin | null;
  /** Cantidad de votantes. Llega siempre, incluso sin haber votado. */
  totalVotes?: number;
  hasVoted?: boolean;
  userVotedOptionId?: number | null;
  /** Solo RANKING: el podio que armó el usuario, en orden. */
  userRanking?: number[] | null;
  /** Solo RANKING: la matriz de posiciones, si el usuario ya votó. */
  rankingResults?: PollRankingResults | null;
  likesCount?: number;
  dislikesCount?: number;
  userReaction?: ReactionType | null;

  stats?: {
    comments: number;
    reactions: number;
  };
}
/** Plan de suscripción del autor de un comentario. */
export type CommentTier = Exclude<SubscriptionTier, "NONE">;

/**
 * Autor de un comentario (`toCommentAuthor` del backend). Vista común: solo el @username,
 * nunca el nombre ni el correo.
 */
export interface CommentUser {
  id: string;
  username: string | null;
  /** Escudo del equipo del usuario: su "foto", como en el chat. */
  badgeUrl: string | null;
  /** Plan vigente; `null` sin suscripción. */
  tier: CommentTier | null;
  /** `assetId` del color de nombre equipado (clave de `NAME_COLORS`). */
  nameColor: string | null;
}

export interface Comment {
  id: string;
  pollId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: CommentUser;
  likesCount?: number;
  dislikesCount?: number;
  userReaction?: ReactionType | null;
  isPremium: boolean;
}

export interface ActivePollMessage {
  id: string;
  title: string;
  timestamp: number;
}


export interface PaginatedComments {
  data: Comment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginatedPolls {
  data: Poll[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

/** Respuesta del ack de `castVote` por socket. */
export interface VoteAck {
  status?: string;
  success?: boolean;
  /** Código de error del backend, por ejemplo `ALREADY_VOTED`. */
  code?: string;
  message?: string;
}

export type ReactionType = 'LIKE' | 'DISLIKE';


export interface ProposePollDto {
  title: string;
  description?: string;
  type?: PollType;
  options?: string[];
  /** Escudos alineados por índice con options; cadena vacía para una opción sin escudo. */
  optionTeamIds?: string[];
  config?: PollConfigInput;
  icon?: string;
}

export interface ApprovePollDto {
  startsAt: string;
  endsAt: string;
}

export interface CreatePollOption {
  label: string;
  teamId?: string;
}

export interface CreatePollDto {
  title: string;
  description?: string;
  type?: PollType;
  options?: CreatePollOption[];
  config?: PollConfigInput;
  commentsEnabled?: boolean;
  startsAt?: string;
  /** Opcional: los tipos informativos no cierran. */
  endsAt?: string;
  icon?: string;
}

export interface CreateCommentDto {
  text: string;
}

export interface ReactDto {
  type: ReactionType;
}


export interface AdminPollItem {
  type?: PollType;
  config?: PollConfig | null;
  ticketCost?: number;
  id: string;
  title: string;
  description?: string | null;
  options: PollOption[];
  status: PollStatus;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  icon: string;
  isOfficial: boolean;
  userId?: string | null;
  user?: PollAuthor | null;
  createdByAdmin?: PollAdmin | null;
  totalVotes?: number;
  likesCount?: number;
  dislikesCount?: number;
  stats?: {
    comments: number;
    reactions: number;
  };
}