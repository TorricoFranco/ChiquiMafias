import { useMutation } from "@tanstack/react-query";
import { useUserStore } from "@/store/useUserStore";
import { profileApi } from "../api/profileApi";

export const useUpdateProfile = () => {
    return useMutation({
        mutationFn: profileApi.updateProfile,
        onSuccess: (updated) => {
            useUserStore.getState().setUserInfo({
                username: updated.username,
                team: updated.team,
            });
        },
    });
};
