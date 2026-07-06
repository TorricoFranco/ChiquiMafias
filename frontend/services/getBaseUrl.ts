export const getBaseUrl = () => {
    const isServer = typeof window === 'undefined';
    return isServer
        ? (process.env.API_INTERNAL_URL || "http://host.docker.internal:3007")
        : (process.env.NEXT_PUBLIC_API_URL || "");
};