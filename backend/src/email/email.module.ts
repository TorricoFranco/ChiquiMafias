import { Module } from '@nestjs/common'
import { EmailService } from './email.service'
import { EmailListener } from './email.listener'

@Module({
  imports: [],
  providers: [EmailService, EmailListener],
  exports: [EmailService],
})
export class EmailModule { }
