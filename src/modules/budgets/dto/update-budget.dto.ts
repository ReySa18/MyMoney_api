import { IsString, IsNumber, IsOptional, MaxLength, Min, Matches, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  limit?: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color harus berupa hex code (contoh: #4f46e5)' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
