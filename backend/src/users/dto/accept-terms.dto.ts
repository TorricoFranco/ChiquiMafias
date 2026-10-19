import { Equals } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AcceptTermsDto {
  @ApiProperty({
    description:
      'Aceptación de los Términos, la Política de Privacidad y declaración de ser mayor de 18 años',
    example: true,
  })
  @Equals(true, {
    message:
      'Tenés que aceptar los Términos y confirmar que sos mayor de 18 años',
  })
  acceptTerms: boolean
}
