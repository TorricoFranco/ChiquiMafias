import type { Role, SubscriptionTier, UserTeam } from "@/types/user";
import { LOCAL_IMAGE, nextId } from "./ids";

/** `UserEntity` del backend serializado (respuesta de /auth/refresh y /auth/dev-login). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isFirstLogin: boolean;
  status: "ACTIVE" | "BANNED";
  mutedUntil: string | null;
  role: Role;
  activeSubscriptionTier: Exclude<SubscriptionTier, "NONE"> | null;
  currentStreak: number;
  lastCheckIn: string | null;
  streakRewardClaimed: boolean;
  activeNameColorId: string | null;
  activeBannerId: string | null;
  activeChatBubbleId: string | null;
  createdAt: string;
  teamId: string | null;
  team: (UserTeam & { tier?: number }) | null;
}

export const TEAMS = {
  boca: { id: "team-boca", name: "Boca Juniors", slug: "boca-juniors", badgeUrl: LOCAL_IMAGE },
  river: { id: "team-river", name: "River Plate", slug: "river-plate", badgeUrl: LOCAL_IMAGE },
  racing: { id: "team-racing", name: "Racing Club", slug: "racing-club", badgeUrl: LOCAL_IMAGE },
} satisfies Record<string, UserTeam>;

export function buildAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  const id = overrides.id ?? nextId("user");
  const team = overrides.team === undefined ? TEAMS.boca : overrides.team;
  return {
    id,
    name: "Hincha E2E",
    email: `${id}@chiquimafias.test`,
    username: "hincha_e2e",
    isFirstLogin: false,
    status: "ACTIVE",
    mutedUntil: null,
    role: "USER",
    activeSubscriptionTier: null,
    currentStreak: 3,
    lastCheckIn: "2026-05-10T12:00:00.000Z",
    streakRewardClaimed: true,
    activeNameColorId: null,
    activeBannerId: null,
    activeChatBubbleId: null,
    createdAt: "2026-01-15T12:00:00.000Z",
    teamId: team?.id ?? null,
    ...overrides,
    team,
  };
}
