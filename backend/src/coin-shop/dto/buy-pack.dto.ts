import { IsUUID } from 'class-validator';

export class BuyPackDto {
  @IsUUID()
  packId: string;
}
