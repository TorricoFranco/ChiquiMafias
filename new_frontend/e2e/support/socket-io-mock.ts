import type { Page, WebSocketRoute } from "@playwright/test";

// Engine.IO v4: 0 open, 2 ping, 3 pong, 4 message.
// Socket.IO v5 (dentro de un "4"): 0 connect, 1 disconnect, 2 event, 3 ack, 4 connect_error.

export interface ReceivedEvent {
  connectionId: number;
  nsp: string;
  event: string;
  data: unknown;
}

export interface SocketContext {
  connectionId: number;
  nsp: string;
  /** Emite solo a la conexión que disparó el evento. */
  emit: (event: string, data?: unknown) => void;
}

type EmitHandler = (data: unknown, ctx: SocketContext) => unknown;
type ConnectHandler = (auth: unknown, ctx: SocketContext) => void;

interface Connection {
  id: number;
  ws: WebSocketRoute;
  namespaces: Map<string, unknown>;
}

interface WaitOptions {
  nsp?: string;
  timeout?: number;
  predicate?: (data: unknown) => boolean;
}

const POLL_MS = 50;

function prefix(nsp: string) {
  return nsp === "/" ? "" : `${nsp},`;
}

function parsePacket(packet: string) {
  const type = Number(packet[0]);
  let i = 1;
  let nsp = "/";

  if (packet[i] === "/") {
    const comma = packet.indexOf(",", i);
    nsp = comma === -1 ? packet.slice(i) : packet.slice(i, comma);
    i = comma === -1 ? packet.length : comma + 1;
  }

  let digits = "";
  while (i < packet.length && packet[i] >= "0" && packet[i] <= "9") digits += packet[i++];

  const rest = packet.slice(i);
  return {
    type,
    nsp,
    ackId: digits ? Number(digits) : undefined,
    payload: rest ? JSON.parse(rest) : undefined,
  };
}

/** Servidor Socket.IO falso para la app (namespaces "/" y "/bets"). */
export class SocketMock {
  private connections: Connection[] = [];
  private received: ReceivedEvent[] = [];
  private emitHandlers = new Map<string, EmitHandler>();
  private connectHandlers: { nsp: string; handler: ConnectHandler }[] = [];
  private rejected = new Map<string, string>();
  private sequence = 0;

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.routeWebSocket(/\/socket\.io\//, (ws) => this.accept(ws));
  }

  /** Respuesta del servidor a un evento del cliente; si el cliente pidió ack, se le devuelve lo que retorne el handler. */
  onEmit(event: string, handler: EmitHandler, { nsp = "/" } = {}) {
    this.emitHandlers.set(`${nsp}|${event}`, handler);
  }

  onConnect(handler: ConnectHandler, { nsp = "/" } = {}) {
    this.connectHandlers.push({ nsp, handler });
  }

  /** Simula el middleware del backend que rechaza la conexión (connect_error). */
  rejectNamespace(nsp: string, message: string) {
    this.rejected.set(nsp, message);
  }

  /** Emite a todas las conexiones del namespace; espera a que haya al menos una. */
  async emit(event: string, data?: unknown, { nsp = "/", timeout = 10_000 } = {}) {
    await this.waitForConnection({ nsp, timeout });
    for (const connection of this.connectionsIn(nsp)) {
      this.send(connection, nsp, event, data);
    }
  }

  /**
   * Espera al menos una conexión al namespace y que ningún socket abierto siga a mitad del handshake
   * (la home abre más de un socket a "/"; si uno todavía no conectó, se perdería el evento).
   */
  async waitForConnection({ nsp = "/", timeout = 10_000 } = {}) {
    await this.poll(
      () => {
        const handshaking = this.connections.some((connection) => connection.namespaces.size === 0);
        return this.connectionsIn(nsp).length > 0 && !handshaking ? true : undefined;
      },
      timeout,
      () => `Ninguna conexión de Socket.IO lista en el namespace "${nsp}"`,
    );
  }

  /** Devuelve el payload del primer evento del cliente que coincida (incluye los ya recibidos). */
  async waitForEmit(event: string, { nsp = "/", timeout = 10_000, predicate }: WaitOptions = {}) {
    const found = await this.poll(
      () =>
        this.received.find(
          (entry) => entry.event === event && entry.nsp === nsp && (!predicate || predicate(entry.data)),
        ),
      timeout,
      () => {
        const seen = this.received.map((entry) => `${entry.nsp} ${entry.event}`).join(", ") || "ninguno";
        return `El cliente no emitió "${event}" en "${nsp}". Eventos recibidos: ${seen}`;
      },
    );
    return found.data;
  }

  emitted(event: string, { nsp = "/" } = {}) {
    return this.received.filter((entry) => entry.event === event && entry.nsp === nsp).map((entry) => entry.data);
  }

  private connectionsIn(nsp: string) {
    return this.connections.filter((connection) => connection.namespaces.has(nsp));
  }

  private accept(ws: WebSocketRoute) {
    const connection: Connection = { id: ++this.sequence, ws, namespaces: new Map() };
    this.connections.push(connection);

    ws.onMessage((message) => this.handleMessage(connection, String(message)));
    ws.onClose(() => {
      this.connections = this.connections.filter((c) => c !== connection);
    });

    // Intervalos de heartbeat largos para que el cliente no corte por ping timeout durante el test.
    ws.send(
      `0${JSON.stringify({
        sid: `e2e-${connection.id}`,
        upgrades: [],
        pingInterval: 600_000,
        pingTimeout: 600_000,
        maxPayload: 1_000_000,
      })}`,
    );
  }

  private handleMessage(connection: Connection, message: string) {
    if (message === "2") {
      connection.ws.send("3");
      return;
    }
    if (!message.startsWith("4")) return;

    const { type, nsp, ackId, payload } = parsePacket(message.slice(1));

    if (type === 0) this.handleConnect(connection, nsp, payload);
    else if (type === 1) connection.namespaces.delete(nsp);
    else if (type === 2) void this.handleEvent(connection, nsp, ackId, payload as unknown[]);
  }

  private handleConnect(connection: Connection, nsp: string, auth: unknown) {
    const rejection = this.rejected.get(nsp);
    if (rejection) {
      connection.ws.send(`44${prefix(nsp)}${JSON.stringify({ message: rejection })}`);
      return;
    }

    connection.namespaces.set(nsp, auth);
    connection.ws.send(`40${prefix(nsp)}${JSON.stringify({ sid: `e2e-${connection.id}-${nsp}` })}`);

    const ctx = this.context(connection, nsp);
    for (const { handler } of this.connectHandlers.filter((entry) => entry.nsp === nsp)) {
      handler(auth, ctx);
    }
  }

  private async handleEvent(connection: Connection, nsp: string, ackId: number | undefined, payload: unknown[]) {
    const [event, data] = payload as [string, unknown];
    this.received.push({ connectionId: connection.id, nsp, event, data });

    const handler = this.emitHandlers.get(`${nsp}|${event}`);
    const result = handler ? await handler(data, this.context(connection, nsp)) : undefined;

    if (ackId !== undefined) {
      connection.ws.send(`43${prefix(nsp)}${ackId}${JSON.stringify([result])}`);
    }
  }

  private context(connection: Connection, nsp: string): SocketContext {
    return {
      connectionId: connection.id,
      nsp,
      emit: (event, data) => this.send(connection, nsp, event, data),
    };
  }

  private send(connection: Connection, nsp: string, event: string, data: unknown) {
    const args = data === undefined ? [event] : [event, data];
    connection.ws.send(`42${prefix(nsp)}${JSON.stringify(args)}`);
  }

  private async poll<T>(probe: () => T | undefined, timeout: number, failureMessage: () => string): Promise<T> {
    const deadline = Date.now() + timeout;
    for (;;) {
      const value = probe();
      if (value !== undefined) return value;
      if (Date.now() > deadline) throw new Error(failureMessage());
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }
}
