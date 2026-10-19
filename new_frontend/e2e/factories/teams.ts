import type { FootballTeamUserProfile } from "@/features/teams/types";
import { LOCAL_IMAGE, nextId } from "./ids";

export function buildTeam(overrides: Partial<FootballTeamUserProfile> = {}): FootballTeamUserProfile {
  return { id: nextId("team"), name: "Racing Club", badgeUrl: LOCAL_IMAGE, tier: 1, ...overrides };
}
