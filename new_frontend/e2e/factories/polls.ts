import type {
  AdminPollItem,
  Comment,
  CommentUser,
  PaginatedComments,
  Poll,
  PollAuthor,
} from "@/features/polls/types";
import { nextId } from "./ids";

export function buildPoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: nextId("poll"),
    title: "¿Quién gana el clásico?",
    description: null,
    options: [
      { id: 1, label: "Boca", votes: 2 },
      { id: 2, label: "River", votes: 1 },
    ],
    status: "ACTIVE",
    createdAt: "2026-05-10T18:00:00.000Z",
    startsAt: "2026-05-10T18:00:00.000Z",
    endsAt: "2030-05-12T18:00:00.000Z",
    icon: "⚽",
    type: "CLASSIC",
    isOfficial: false,
    user: buildPollAuthor(),
    userVotedOptionId: null,
    hasVoted: false,
    totalVotes: 3,
    likesCount: 4,
    dislikesCount: 1,
    userReaction: null,
    stats: { comments: 0, reactions: 5 },
    ...overrides,
  };
}

/** Autor de una encuesta de la comunidad, con equipo y suscripción como los manda el backend. */
export function buildPollAuthor(overrides: Partial<PollAuthor> = {}): PollAuthor {
  return {
    id: "user-autor",
    name: "Juan Tribunero",
    username: "tribunero",
    activeSubscriptionTier: null,
    team: { id: "team-1", name: "Boca Juniors", badgeUrl: "/escudos/boca-juniors.webp" },
    ...overrides,
  };
}

/** Encuesta publicada por la moderación: no expone a ninguna persona. */
export function buildOfficialPoll(overrides: Partial<Poll> = {}): Poll {
  return buildPoll({ isOfficial: true, user: null, ...overrides });
}

/** Encuesta tal como la lista el panel de moderación (pendiente por defecto). */
export function buildAdminPoll(overrides: Partial<AdminPollItem> = {}): AdminPollItem {
  return { ...buildPoll(), status: "PENDING", ...overrides };
}

/** Autor de un comentario sin suscripción, sin escudo y sin color equipado. */
export function buildCommentUser(overrides: Partial<CommentUser> = {}): CommentUser {
  return { id: "user-comentario", username: "opinologo", badgeUrl: null, tier: null, nameColor: null, ...overrides };
}

export function buildComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: nextId("comment"),
    pollId: "poll-1",
    userId: "user-comentario",
    text: "Gana Boca, no hay discusión",
    createdAt: "2026-05-10T19:00:00.000Z",
    user: buildCommentUser(),
    likesCount: 0,
    dislikesCount: 0,
    userReaction: null,
    isPremium: false,
    ...overrides,
  };
}

export function paginatedComments(data: Comment[]): PaginatedComments {
  return { data, meta: { total: data.length, page: 1, limit: 20, totalPages: 1 } };
}
