import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ProposePollDto {
  @ApiProperty({ example: '¿Quién gana el superclásico?' })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ example: 'Voten a conciencia', required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    example: ['Boca', 'River', 'Empate'],
    description: 'Opciones de texto plano',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2, { message: 'Tenés que poner al menos 2 opciones' })
  options: string[]

  @ApiProperty({ example: 'FOOTBALL', required: false })
  @IsString()
  @IsOptional()
  icon?: string
}
