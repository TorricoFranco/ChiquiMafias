import { IsArray, IsString, IsNotEmpty } from 'class-validator'

export class MarkAsReadDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[]
}
