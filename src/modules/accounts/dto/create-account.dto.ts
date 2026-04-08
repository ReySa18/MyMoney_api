import { IsString, IsNumber, IsOptional, IsIn, MaxLength, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn(['savings', 'ewallet', 'cash', 'investment', 'credit'])
  type: 'savings' | 'ewallet' | 'cash' | 'investment' | 'credit';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  balance: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color harus berupa hex code (contoh: #4f46e5)' })
  color?: string;
}
