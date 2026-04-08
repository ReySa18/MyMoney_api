import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  async getMonthlyReport(
    @CurrentUser() user: JwtPayload,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.reportsService.getMonthlyReport(user.sub, yearNum);
  }

  @Get('yearly')
  async getYearlyReport(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getYearlyReport(user.sub);
  }
}
