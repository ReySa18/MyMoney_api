import { IsString, IsNumber, IsOptional, MaxLength, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  type: string; // Saham, Reksa Dana, Emas, Deposito, Crypto

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color harus berupa hex code (contoh: #4f46e5)' })
  color?: string;
}
