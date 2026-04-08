import { IsString, IsNumber, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetHistoryDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Date harus format YYYY-MM' })
  date: string; // format: YYYY-MM

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  value: number;
}
