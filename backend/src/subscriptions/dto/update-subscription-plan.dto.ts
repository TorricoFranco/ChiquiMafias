import { 
  IsOptional, 
  IsArray, 
  IsString, 
  IsInt, 
  Min, 
  Max, 
  IsNumber, 
  IsBoolean 
} from 'class-validator';

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  storeDiscountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceARS?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}