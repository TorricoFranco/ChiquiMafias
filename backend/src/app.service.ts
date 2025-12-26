import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from './prisma/prisma.service'

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getHello(): string {
    // const users = await this.prisma.users.findMany()

    return 'Hola'
  }
}
