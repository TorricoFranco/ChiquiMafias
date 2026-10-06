import { useUserStore } from "@/store/useUserStore";
import Cookies from "js-cookie";

let isRefreshing = false;
// `null` = el refresh falló: cada request en cola se resuelve con su 401 original.
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = null;

    if (typeof window !== "undefined") {
        accessToken = useUserStore.getState().accessToken;
    } else {
        try {
            const { cookies } = require("next/headers");
            accessToken = cookies().get("accessToken")?.value || null;
        } catch (error) {
            console.warn("No se pudo leer la cookie en el servidor");
        }
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    options.headers = headers;
    options.credentials = "include";

    let response = await fetch(url, options);

    // Si la cuenta se suspende en medio de la sesión, el backend responde 403 USER_BANNED: mostramos la apelación.
    if (response.status === 403 && typeof window !== "undefined") {
        const body = await response.clone().json().catch(() => null);
        if (body?.code === "USER_BANNED") {
            useUserStore.getState().setIsBanned(true);
        }
    }

    // Sin access token no hay sesión que renovar: un visitante no dispara refresh ni logout.
    if (response.status === 401 && accessToken && !url.includes("/auth/refresh") && !url.includes("/auth/google")) {

        if (isRefreshing) {
            return new Promise((resolve) => {
                subscribeTokenRefresh(async (newToken) => {
                    if (!newToken) {
                        resolve(response);
                        return;
                    }
                    const retryHeaders = new Headers(options.headers);
                    retryHeaders.set("Authorization", `Bearer ${newToken}`);
                    options.headers = retryHeaders;
                    resolve(await fetch(url, options));
                });
            });
        }

        isRefreshing = true;

        try {
            const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });

            if (refreshRes.ok) {
                const data = await refreshRes.json();

                const newAccessToken = data.access_token;

                if (typeof window !== "undefined") {
                    useUserStore.getState().setUserInfo({ accessToken: newAccessToken });

                    Cookies.set("accessToken", newAccessToken, {
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        expires: 7
                    });
                }

                isRefreshing = false;
                onRefreshed(newAccessToken);

                const retryHeaders = new Headers(options.headers);
                retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
                options.headers = retryHeaders;

                return await fetch(url, options);
            } else {
                isRefreshing = false;
                onRefreshed(null);
                if (typeof window !== "undefined") {
                    await useUserStore.getState().logout();
                }
                return response;
            }
        } catch (error) {
            isRefreshing = false;
            onRefreshed(null);
            if (typeof window !== "undefined") {
                await useUserStore.getState().logout();
            }
            return response;
        }
    }

    return response;
}