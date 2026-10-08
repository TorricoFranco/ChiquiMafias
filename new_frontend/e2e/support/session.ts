import type { Role } from "@/types/user";
import { buildAuthUser, type AuthUser } from "../factories/user";
import type { ApiMock } from "./api-mock";

type SessionState = "anonymous" | "authenticated";

/**
 * Sesión del backend simulada. La app restaura la sesión con POST /auth/refresh al montar,
 * así que alcanza con configurar esto antes de `page.goto`.
 */
export class MockSession {
  state: SessionState = "anonymous";
  user: AuthUser | null = null;
  balance = 0;
  private tokenVersion = 1;
  private googleAccount: { user: AuthUser; balance: number } | null = null;

  get token() {
    return `e2e-access-token-${this.tokenVersion}`;
  }

  private bannedAfterRefresh = false;

  get isBanned() {
    return this.user?.status === "BANNED" || this.bannedAfterRefresh;
  }

  loginAs(role: Role = "USER", overrides: Partial<AuthUser> = {}, { balance = 1_000 } = {}) {
    this.state = "authenticated";
    this.user = buildAuthUser({ role, ...overrides });
    this.balance = balance;
    return this.user;
  }

  /** Cuenta con la que entra el botón del GSI falso (POST /auth/google). */
  allowGoogleLogin(overrides: Partial<AuthUser> = {}, { balance = 1_000 } = {}) {
    const user = buildAuthUser(overrides);
    this.googleAccount = { user, balance };
    return user;
  }

  /**
   * Usuario baneado, como lo devuelve el backend real: el refresh responde 200 con `status: "BANNED"`
   * y el UserStatusGuard rechaza todo lo que no sea apelación.
   */
  loginAsBanned(overrides: Partial<AuthUser> = {}) {
    return this.loginAs("USER", { ...overrides, status: "BANNED" });
  }

  /**
   * La cuenta se suspendió después del último refresh: /auth/refresh todavía la informa activa,
   * pero el UserStatusGuard ya rechaza las rutas protegidas con 403 USER_BANNED.
   */
  banAfterRefresh() {
    this.bannedAfterRefresh = true;
  }

  /** Invalida el access token vigente: la próxima request protegida da 401 y /auth/refresh entrega uno nuevo. */
  expireAccessToken() {
    this.tokenVersion += 1;
  }

  isAuthorized(authorization: string | undefined) {
    return this.state === "authenticated" && authorization === `Bearer ${this.token}`;
  }

  install(api: ApiMock) {
    api.setAuthorizer((authorization) => this.isAuthorized(authorization));
    api.setBannedCheck(() => this.isBanned);

    api.handle("POST", "/auth/refresh", () => {
      if (this.state === "anonymous") {
        return { status: 401, body: { statusCode: 401, message: "No hay token de refresco" } };
      }
      return { body: { access_token: this.token, user: this.user } };
    });

    api.handle("POST", "/auth/google", () => {
      if (!this.googleAccount) {
        return { status: 401, body: { statusCode: 401, message: "Token de Google inválido" } };
      }
      this.state = "authenticated";
      this.user = this.googleAccount.user;
      this.balance = this.googleAccount.balance;
      return { body: { access_token: this.token, user: this.user } };
    });

    api.handle("POST", "/auth/logout", () => {
      this.state = "anonymous";
      this.user = null;
      return { body: { status: "ok", message: "Sesión cerrada" } };
    });
  }
}
