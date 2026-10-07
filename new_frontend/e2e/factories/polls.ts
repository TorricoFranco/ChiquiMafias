import type { Comment, PaginatedComments, Poll } from "@/features/polls/types";
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
    user: { id: "user-autor", username: "tribunero" },
    userVotedOptionId: null,
    likesCount: 4,
    dislikesCount: 1,
    userReaction: null,
    stats: { comments: 0, reactions: 5 },
    ...overrides,
  };
}

export function buildComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: nextId("comment"),
    pollId: "poll-1",
    userId: "user-comentario",
    text: "Gana Boca, no hay discusión",
    createdAt: "2026-05-10T19:00:00.000Z",
    user: { id: "user-comentario", username: "opinologo" },
    likesCount: 0,
    dislikesCount: 0,
    userReaction: null,
    isPremium: false,
    ...overrides,
  };
}

export function paginatedComments(data: Comment[]): PaginatedComments {
  return { data, meta: { total: data.length, page: 1, limit: 20, lastPage: 1 } };
}
