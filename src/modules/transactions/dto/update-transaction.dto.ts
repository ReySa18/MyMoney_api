import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category_icon?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
