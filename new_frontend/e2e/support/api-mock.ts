import type { Page, Route } from "@playwright/test";
import { API_URL, BASE_URL } from "./env";
import { isAllowedForBannedUser, isPublicRoute } from "./public-routes";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface MockRequest {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockResponse {
  status?: number;
  body?: unknown;
}

export interface OnOptions {
  status?: number;
  /** Cantidad de veces que responde antes de dejar pasar a la registración anterior. */
  times?: number;
}

type Handler = (req: MockRequest) => MockResponse | Promise<MockResponse>;

interface Registration {
  method: HttpMethod;
  pattern: string;
  match: (path: string) => Record<string, string> | null;
  handler: Handler;
  remaining: number;
}

const API_ORIGIN = new URL(API_URL).origin;
const APP_ORIGIN = new URL(BASE_URL).origin;

const CORS_HEADERS = {
  "access-control-allow-origin": APP_ORIGIN,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function compilePattern(pattern: string) {
  const keys: string[] = [];
  const source = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  const regex = new RegExp(`^${source}/?$`);

  return (path: string) => {
    const found = regex.exec(path);
    if (!found) return null;
    return Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]));
  };
}

/**
 * Mock HTTP estricto del backend: toda request a la API sin handler responde 501
 * y hace fallar el test en el teardown.
 */
export class ApiMock {
  private registrations: Registration[] = [];
  private recorded: MockRequest[] = [];
  private unhandled: string[] = [];
  private waiters: { method: HttpMethod; pattern: string; resolve: (req: MockRequest) => void }[] = [];
  private authorizer: (authorization: string | undefined) => boolean = () => true;
  private isBanned: () => boolean = () => false;

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.route(
      (url) => url.origin === API_ORIGIN && !url.pathname.startsWith("/socket.io"),
      (route) => this.dispatch(route),
    );
  }

  setAuthorizer(fn: (authorization: string | undefined) => boolean) {
    this.authorizer = fn;
  }

  /** Como el UserStatusGuard: un usuario baneado recibe 403 USER_BANNED salvo en las rutas de apelación. */
  setBannedCheck(fn: () => boolean) {
    this.isBanned = fn;
  }

  /** Responde `body` (o lo que devuelva la función) con status 200 o `options.status`. */
  on(method: HttpMethod, pattern: string, body: (req: MockRequest) => unknown, options?: OnOptions): this;
  on(method: HttpMethod, pattern: string, body: unknown, options?: OnOptions): this;
  on(method: HttpMethod, pattern: string, body: unknown, options: OnOptions = {}) {
    const resolveBody =
      typeof body === "function" ? (body as (req: MockRequest) => unknown) : () => body;
    return this.handle(
      method,
      pattern,
      async (req) => ({ status: options.status ?? 200, body: await resolveBody(req) }),
      options,
    );
  }

  /** Control total de la respuesta (status dinámico, efectos sobre el estado del test). */
  handle(method: HttpMethod, pattern: string, handler: Handler, options: OnOptions = {}) {
    this.registrations.push({
      method,
      pattern,
      match: compilePattern(pattern),
      handler,
      remaining: options.times ?? Number.POSITIVE_INFINITY,
    });
    return this;
  }

  requests(method: HttpMethod, pattern: string) {
    const match = compilePattern(pattern);
    return this.recorded.filter((req) => req.method === method && match(req.path));
  }

  lastRequest(method: HttpMethod, pattern: string) {
    return this.requests(method, pattern).at(-1);
  }

  /** Espera la próxima request que coincida (o devuelve la última si ya llegó y `includePast`). */
  waitFor(method: HttpMethod, pattern: string, { includePast = false } = {}) {
    const past = includePast ? this.lastRequest(method, pattern) : undefined;
    if (past) return Promise.resolve(past);
    return new Promise<MockRequest>((resolve) => {
      this.waiters.push({ method, pattern, resolve });
    });
  }

  assertNoUnhandled() {
    if (this.unhandled.length === 0) return;
    const list = [...new Set(this.unhandled)].map((entry) => `  - ${entry}`).join("\n");
    throw new Error(
      `La app pidió endpoints sin mock (agregalos en el test o en e2e/support/defaults.ts):\n${list}`,
    );
  }

  private async dispatch(route: Route) {
    const request = route.request();
    const method = request.method().toUpperCase();

    if (method === "OPTIONS") {
      await this.safeFulfill(route, { status: 204, headers: CORS_HEADERS });
      return;
    }

    const url = new URL(request.url());
    // `allHeaders()` puede no resolver nunca con requests interceptadas; las que pone la app ya vienen acá.
    const headers = request.headers();
    const mockRequest: MockRequest = {
      method: method as HttpMethod,
      path: url.pathname,
      params: {},
      query: url.searchParams,
      headers,
      body: parseBody(request.postData()),
    };

    const registration = this.findRegistration(mockRequest);
    if (!registration) {
      this.unhandled.push(`${method} ${url.pathname}`);
      await this.respond(route, { status: 501, body: { message: `E2E: ${method} ${url.pathname} sin mock` } });
      return;
    }

    mockRequest.params = registration.match(mockRequest.path) ?? {};
    this.recorded.push(mockRequest);
    this.notifyWaiters(mockRequest);

    if (!isPublicRoute(method, url.pathname)) {
      if (!this.authorizer(headers.authorization)) {
        await this.respond(route, { status: 401, body: { statusCode: 401, message: "Unauthorized" } });
        return;
      }
      if (this.isBanned() && !isAllowedForBannedUser(method, url.pathname)) {
        await this.respond(route, {
          status: 403,
          body: { statusCode: 403, message: "Tu cuenta se encuentra suspendida por irregularidades.", code: "USER_BANNED" },
        });
        return;
      }
    }

    registration.remaining -= 1;
    await this.respond(route, await registration.handler(mockRequest));
  }

  private findRegistration(req: MockRequest) {
    for (let i = this.registrations.length - 1; i >= 0; i--) {
      const registration = this.registrations[i];
      if (registration.remaining <= 0) continue;
      if (registration.method !== req.method) continue;
      if (registration.match(req.path)) return registration;
    }
    return undefined;
  }

  private notifyWaiters(req: MockRequest) {
    this.waiters = this.waiters.filter((waiter) => {
      if (waiter.method !== req.method || !compilePattern(waiter.pattern)(req.path)) return true;
      waiter.resolve(req);
      return false;
    });
  }

  private async respond(route: Route, response: MockResponse) {
    const status = response.status ?? 200;
    await this.safeFulfill(route, {
      status,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
      body: status === 204 ? "" : JSON.stringify(response.body ?? null),
    });
  }

  private async safeFulfill(route: Route, options: Parameters<Route["fulfill"]>[0]) {
    try {
      await route.fulfill(options);
    } catch {
      // La página puede cerrarse con requests de polling en vuelo.
    }
  }
}

function parseBody(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
