import { useUserStore } from "@/store/useUserStore";
import Cookies from "js-cookie";

// El backend rota el refresh token sin período de gracia: dos POST /auth/refresh en paralelo con la misma
// cookie hacen que el segundo dé 401 y cierre la sesión. Por eso todo refresh pasa por acá, dentro del lock.
let refreshPromise: Promise<string | null> | null = null;
let sessionRefreshPromise: Promise<SessionRefresh> | null = null;

// Solo mira `exp` (sin validar la firma) para decidir si vale la pena reusar el token de otra pestaña.
const isTokenFresh = (token: string) => {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 30_000;
    } catch {
        return false;
    }
};

// Serializa el refresh entre pestañas cuando el navegador lo soporta. No anidar: el lock no es reentrante.
const withRefreshLock = async <T>(fn: () => Promise<T>): Promise<T> =>
    typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request("chiquimafias-auth-refresh", fn)
        : fn();

// Solo se llama con el lock tomado.
const postRefresh = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
};

type SessionRefresh = Awaited<ReturnType<typeof postRefresh>>;

const requestNewToken = async (failedToken: string | null): Promise<string | null> => {
    // Otra pestaña pudo renovar mientras esperábamos el lock: la cookie `accessToken` es compartida.
    const sharedToken = Cookies.get("accessToken");
    if (sharedToken && sharedToken !== failedToken && isTokenFresh(sharedToken)) {
        useUserStore.getState().setUserInfo({ accessToken: sharedToken });
        return sharedToken;
    }

    try {
        const { ok, data } = await postRefresh();

        if (!ok) {
            await useUserStore.getState().logout();
            return null;
        }

        const newAccessToken: string = data.access_token;

        useUserStore.getState().setUserInfo({ accessToken: newAccessToken });
        Cookies.set("accessToken", newAccessToken, {
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: 7
        });

        // El refresh no rechaza a un usuario baneado (conserva el token para apelar): mostramos la apelación.
        if (data.user?.status === "BANNED") {
            useUserStore.getState().setIsBanned(true);
        }

        return newAccessToken;
    } catch {
        await useUserStore.getState().logout();
        return null;
    }
};

/**
 * Renueva el access token con la cookie de refresh. Las llamadas concurrentes comparten el mismo pedido.
 * Devuelve `null` si la sesión no se pudo renovar (y en ese caso ya cerró la sesión local).
 */
export function refreshAccessToken(failedToken: string | null = useUserStore.getState().accessToken): Promise<string | null> {
    // En el servidor no hay cookie de refresh que mandar.
    if (typeof window === "undefined") return Promise.resolve(null);

    if (!refreshPromise) {
        refreshPromise = withRefreshLock(() => requestNewToken(failedToken)).finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

/**
 * POST /auth/refresh para restaurar la sesión al cargar la app: devuelve la respuesta completa (con el usuario)
 * y no toca el store. Comparte el lock con `refreshAccessToken`, así dos pestañas que abren a la vez no se pisan.
 */
export function refreshSession(): Promise<SessionRefresh> {
    if (!sessionRefreshPromise) {
        sessionRefreshPromise = withRefreshLock(postRefresh).finally(() => {
            sessionRefreshPromise = null;
        });
    }
    return sessionRefreshPromise;
}

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
        const newAccessToken = await refreshAccessToken(accessToken);
        // Sin token nuevo, la request se resuelve con su 401 original.
        if (!newAccessToken) return response;

        const retryHeaders = new Headers(options.headers);
        retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
        options.headers = retryHeaders;

        return await fetch(url, options);
    }

    return response;
}