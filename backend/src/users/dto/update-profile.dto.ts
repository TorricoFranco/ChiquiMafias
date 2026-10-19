import { OmitType, PartialType } from '@nestjs/swagger'
import { CompleteProfileDto } from './complete-profile.dto'

// La aceptación de términos solo se registra en complete-profile y accept-terms.
export class UpdateProfileDto extends PartialType(
  OmitType(CompleteProfileDto, ['acceptTerms'] as const),
) {}
