import { IsOptional, IsString, Matches } from 'class-validator';

export class QueryBudgetDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Period harus format YYYY-MM' })
  period?: string;
}
