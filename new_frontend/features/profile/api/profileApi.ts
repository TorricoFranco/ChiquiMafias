import { apiFetch } from "@/lib/apiFetch";
import { UpdateProfileDto, UpdateProfileResponse } from "../types";

export const profileApi = {
    updateProfile: async (dto: UpdateProfileDto): Promise<UpdateProfileResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/update-profile`, {
            method: "PATCH",
            body: JSON.stringify(dto),
        });

        if (!res.ok) throw new Error("No se pudo actualizar el perfil");
        return res.json();
    },
};
