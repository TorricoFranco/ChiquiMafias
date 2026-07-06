import { IsOptional } from 'class-validator'

export class CancelSubscriptionDto {
    @IsOptional()
    reason?: string
}
