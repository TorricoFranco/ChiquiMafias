import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis
  private readonly subscriber: Redis
  private readonly logger = new Logger(RedisService.name)

  constructor() {
    const redisConfig = {
      host: 'redis',
      port: 6379,
    }

    this.client = new Redis(redisConfig)
    this.subscriber = new Redis(redisConfig)

    this.logger.log('Redis: Conexiones Command y Subscriber listas.')
  }

  /**
   * Getter para mantener compatibilidad con tu código actual.
   * Uso: this.redisService.redis.hgetall(...)
   */
  get redis() {
    return this.client
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    await this.subscriber.subscribe(channel)

    this.subscriber.on('message', (chan, message) => {
      if (chan === channel) {
        callback(message)
      }
    })

    this.logger.log(`Suscrito al canal: ${channel}`)
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
