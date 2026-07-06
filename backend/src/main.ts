import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { webcrypto } from 'crypto'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookieParser from 'cookie-parser';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Swagger config
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

  await app.listen(3007, '0.0.0.0')
}
bootstrap()
