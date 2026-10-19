import { UserTeam } from "@/types/user";

// Refleja UpdateProfileDto del backend (PATCH /users/update-profile): todos los campos son opcionales.
export interface UpdateProfileDto {
    username?: string;
    teamId?: string;
}

export interface UpdateProfileResponse {
    id: string;
    username: string | null;
    team: UserTeam | null;
}

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 15;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
