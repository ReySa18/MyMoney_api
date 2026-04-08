import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @IsString()
  @MaxLength(255)
  description: string;

  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category_icon?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amount: number;

  @IsString()
  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsDateString()
  date: string;

  @IsUUID()
  account_id: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
