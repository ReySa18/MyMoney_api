import { IsString, IsNumber, IsOptional, MaxLength, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color harus berupa hex code (contoh: #4f46e5)' })
  color?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-100)
  @Max(1000)
  change?: number;
}
