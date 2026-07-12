import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'
import { webcrypto } from 'crypto'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import { ConfigService } from '@nestjs/config'
import { SocketIoAdapter } from './adapters/socket-io.adapter'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)

  const clientUrl = configService.get<string>('CLIENT_URL')
  const port = configService.get<number>('PORT') ?? 3007
  const host = configService.get<string>('HOST') ?? '0.0.0.0'

  app.use(cookieParser())

  app.enableCors({
    origin: clientUrl,
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

  const config = new DocumentBuilder()
    .setTitle('Ultra League API')
    .setDescription('API documentation for Ultra League')
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

  await app.listen(port, host)
  console.log(`Application running on: http://${host}:${port}`)
  console.log(`CORS enabled for: ${clientUrl}`)
}
bootstrap()
