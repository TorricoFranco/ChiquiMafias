import { Injectable } from '@nestjs/common'

interface Client {
  id: string
}

type RateLimitState = {
  timestamps: number[]
  strikes: number
  blockedUntil?: number
}

@Injectable()
export class ChatService {
  private clients: Record<string, Client> = {}
  private rateMap = new Map<string, RateLimitState>()

  onClientConnected(client: Client) {
    // Agregar el cliente a la lista de clientes conectados
    this.clients[client.id] = client
  }

  onClientDisconnected(id: string) {
    // Eliminar el cliente de la lista de clientes conectados
    delete this.clients[id]
  }

  getConnectedClients() {
    return Object.values(this.clients)
  }

  checkMessageRate(userId: string) {
    const now = Date.now()

    const windowMs = 10_000 // ventana
    const maxMessages = 5 // permitido
    const penalties = [15, 30, 120] // segundos

    const state = this.rateMap.get(userId) ?? { timestamps: [], strikes: 0 }

    //  todavía sigue bloqueado
    if (state.blockedUntil && now < state.blockedUntil) {
      return {
        allowed: false,
        retryIn: Math.ceil((state.blockedUntil - now) / 1000),
      }
    }

    // limpiar timestamps viejos
    state.timestamps = state.timestamps.filter((t) => now - t < windowMs)

    //  excedió
    if (state.timestamps.length >= maxMessages) {
      state.strikes += 1

      const penaltySeconds = penalties[state.strikes - 1] ?? 300 // fallback 5 min

      state.blockedUntil = now + penaltySeconds * 1000
      state.timestamps = []

      this.rateMap.set(userId, state)

      return {
        allowed: false,
        retryIn: penaltySeconds,
        strike: state.strikes,
      }
    }

    // permitido
    state.timestamps.push(now)
    this.rateMap.set(userId, state)

    return { allowed: true }
  }
}
