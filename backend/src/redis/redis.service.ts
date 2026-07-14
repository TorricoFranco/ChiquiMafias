import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis
  private readonly subscriber: Redis
  private readonly logger = new Logger(RedisService.name)

  private readonly channelCallbacks = new Map<
    string,
    Array<(message: string) => void>
  >()

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const host = this.configService.get<string>('REDIS_HOST', { infer: true })
    const port = this.configService.get<number>('REDIS_PORT', { infer: true })
    const password = this.configService.get<string>('REDIS_PASSWORD', {
      infer: true,
    })

    const redisConfig = { host, port, password }

    this.client = new Redis(redisConfig)
    this.subscriber = new Redis(redisConfig)

    this.logger.log(
      'Redis: Conexiones Command y Subscriber listas con autenticación.',
    )

    this.subscriber.on('message', (channel, message) => {
      const callbacks = this.channelCallbacks.get(channel)
      if (callbacks && callbacks.length > 0) {
        // Ejecutamos todos los callbacks anotados para este canal
        callbacks.forEach((cb) => cb(message))
      }
    })
  }

  get redis() {
    return this.client
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    let callbacks = this.channelCallbacks.get(channel)

    if (!callbacks) {
      callbacks = []
      this.channelCallbacks.set(channel, callbacks)

      await this.subscriber.subscribe(channel)
      this.logger.log(`Suscrito en Redis al canal: ${channel}`)
    }

    callbacks.push(callback)
  }

  async unsubscribe(
    channel: string,
    callbackToRemove: (message: string) => void,
  ) {
    const callbacks = this.channelCallbacks.get(channel)
    if (!callbacks) return

    const filteredCallbacks = callbacks.filter((cb) => cb !== callbackToRemove)
    this.channelCallbacks.set(channel, filteredCallbacks)

    if (filteredCallbacks.length === 0) {
      await this.subscriber.unsubscribe(channel)
      this.channelCallbacks.delete(channel)
      this.logger.log(`Desuscrito en Redis del canal: ${channel}`)
    }
  }

  async publish(channel: string, message: any) {
    const payload =
      typeof message === 'string' ? message : JSON.stringify(message)
    return this.client.publish(channel, payload)
  }

  async onModuleDestroy() {
    await this.client.quit()
    await this.subscriber.quit()
  }
}
