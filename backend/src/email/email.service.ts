import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
  private readonly resend: Resend
  private readonly logger = new Logger(EmailService.name)

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>
  ) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'))
  }

  async sendBanNotification(
    email: string,
    name: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'ChiquiMafias <support@chiquimafias.com>',
        to: email,
        subject: '🚨 Notificación de Suspensión',
        html: `<h1>Hola ${name}</h1><p>Tu cuenta ha sido suspendida por: ${reason}</p>`,
      })
      this.logger.log(`Ban email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send ban email to ${email}`, error)
    }
  }
}
