import { useUserStore } from "@/store/useUserStore";

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { accessToken, setUserInfo, logout } = useUserStore.getState();

  options.headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  options.credentials = "include";

  let response = await fetch(url, options);

  if (response.status === 401 && !url.includes("/auth/refresh") && !url.includes("/auth/google")) {
    try {
      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();

        setUserInfo({ accessToken: data.access_token });

        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${data.access_token}`,
        };

        response = await fetch(url, options);
      } else {
        await logout();
      }
    } catch (error) {
      await logout();
    }
  }

  return response;
}