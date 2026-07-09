import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis
  private readonly subscriber: Redis
  private readonly logger = new Logger(RedisService.name)

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const host = this.configService.get<string>('REDIS_HOST', { infer: true })
    const port = this.configService.get<number>('REDIS_PORT', { infer: true })
    const password = this.configService.get<string>('REDIS_PASSWORD', {
      infer: true,
    })

    const redisConfig = {
      host,
      port,
      password,
    }

    this.client = new Redis(redisConfig)
    this.subscriber = new Redis(redisConfig)

    this.logger.log(
      'Redis: Conexiones Command y Subscriber listas con autenticación.',
    )
  }

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
