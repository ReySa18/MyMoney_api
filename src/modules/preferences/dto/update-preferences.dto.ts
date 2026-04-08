import { IsString, IsOptional, Length, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;
}
