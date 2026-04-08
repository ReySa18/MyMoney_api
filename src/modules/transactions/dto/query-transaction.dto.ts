import { IsOptional, IsString, IsDateString, IsIn, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto';

export class QueryTransactionDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(['income', 'expense', 'all'])
  type?: 'income' | 'expense' | 'all';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsUUID()
  account_id?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
