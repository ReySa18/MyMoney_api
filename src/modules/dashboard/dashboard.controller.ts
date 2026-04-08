import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getSummary(user.sub);
  }

  @Get('cashflow')
  async getCashflow(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getCashflow(user.sub);
  }

  @Get('expense-categories')
  async getExpenseCategories(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getExpenseCategories(user.sub);
  }
}
