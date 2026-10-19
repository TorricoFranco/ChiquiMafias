import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'
import { webcrypto } from 'crypto'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import { ConfigService } from '@nestjs/config'
import { SocketIoAdapter } from './adapters/socket-io.adapter'
import helmet from 'helmet'
import { json } from 'express'
import { NestExpressApplication } from '@nestjs/platform-express'
import { buildCorsOrigins, isProductionLike } from './config/cors'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.use(helmet())

  app.use(json({ limit: '1mb' }))

  const configService = app.get(ConfigService)

  const clientUrl = configService.get<string>('CLIENT_URL')
  const nodeEnv = configService.get<string>('NODE_ENV')
  const isProduction = isProductionLike(nodeEnv)
  const port = configService.get<number>('PORT') ?? 3007
  const host = configService.get<string>('HOST') ?? '0.0.0.0'

  // En producción la API corre detrás de Caddy (un solo salto): sin esto el rate limit
  // ve la IP del proxy y todos los usuarios comparten el mismo contador.
  if (isProduction) app.set('trust proxy', 1)

  app.use(cookieParser())

  app.enableCors({
    origin: buildCorsOrigins(clientUrl, nodeEnv),
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

  app.useWebSocketAdapter(new SocketIoAdapter(app))

  // La documentación de la API no se publica en producción.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('ChiquiMafias API')
      .setDescription('API documentation for ChiquiMafias')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'access-token',
          in: 'header',
        },
        'access-token',
      )
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

  await app.listen(port, host)
  console.log(`Application running on: http://${host}:${port}`)
  console.log(`CORS enabled for: ${clientUrl}`)
}
bootstrap()
