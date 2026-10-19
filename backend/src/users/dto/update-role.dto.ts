import { IsEnum, IsNotEmpty } from 'class-validator'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateRoleDto {
  @ApiProperty({
    enum: SystemRole,
    description:
      'Nuevo rol del usuario objetivo. Solo se puede asignar un rol igual o inferior al propio (jerarquía USER < MODERATOR < ADMIN < PRESIDENT).',
  })
  @IsNotEmpty({ message: 'El rol es requerido, pa.' })
  @IsEnum(SystemRole, {
    message: `El rol enviado no es válido. Valores permitidos: ${Object.values(SystemRole).join(', ')}`,
  })
  role: SystemRole
}
