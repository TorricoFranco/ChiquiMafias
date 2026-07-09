import { IsEnum, IsNotEmpty } from 'class-validator'
import { SystemRole } from 'src/auth/enums/roles.enum'

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'El rol es requerido, pa.' })
  @IsEnum(SystemRole, {
    message: `El rol enviado no es válido. Valores permitidos: ${Object.values(SystemRole).join(', ')}`,
  })
  role: SystemRole
}