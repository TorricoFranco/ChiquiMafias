import { ApiProperty } from '@nestjs/swagger'

class UserAuthResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string

  @ApiProperty({ example: 'Franco' })
  name: string

  @ApiProperty({
    example: true,
    description:
      'Indica si es el primer ingreso del usuario para redirigirlo a completar su perfil',
  })
  isFirstLogin: boolean

  @ApiProperty({
    example: 'ADMIN',
    description: 'Rol asignado al usuario en el sistema',
  })
  role: string
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string

  @ApiProperty({ type: UserAuthResponseDto })
  user: UserAuthResponseDto
}
