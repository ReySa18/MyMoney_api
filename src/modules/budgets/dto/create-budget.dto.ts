import { IsString, IsNumber, IsOptional, MaxLength, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  limit: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color harus berupa hex code (contoh: #4f46e5)' })
  color?: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Period harus format YYYY-MM' })
  period: string; // format: YYYY-MM
}
