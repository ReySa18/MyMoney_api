import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyReport(userId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const data: { month: string; income: number; expense: number }[] = [];
    let totalIncome = 0;
    let totalExpense = 0;

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(targetYear, month, 1);
      const monthEnd = new Date(targetYear, month + 1, 0);

      const [income, expense] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'income',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'expense',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
      ]);

      const monthlyIncome = Number(income._sum.amount) || 0;
      const monthlyExpense = Number(expense._sum.amount) || 0;

      totalIncome += monthlyIncome;
      totalExpense += monthlyExpense;

      data.push({
        month: monthNames[month],
        income: monthlyIncome,
        expense: monthlyExpense,
      });
    }

    return {
      year: targetYear,
      data,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_income: totalIncome - totalExpense,
      },
    };
  }

  async getYearlyReport(userId: string) {
    const currentYear = new Date().getFullYear();
    const years: { year: number; income: number; expense: number; net_income: number }[] = [];

    // Get last 5 years of data
    for (let i = 4; i >= 0; i--) {
      const targetYear = currentYear - i;
      const yearStart = new Date(targetYear, 0, 1);
      const yearEnd = new Date(targetYear, 11, 31);

      const [income, expense] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'income',
            date: { gte: yearStart, lte: yearEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'expense',
            date: { gte: yearStart, lte: yearEnd },
          },
          _sum: { amount: true },
        }),
      ]);

      const yearlyIncome = Number(income._sum.amount) || 0;
      const yearlyExpense = Number(expense._sum.amount) || 0;

      years.push({
        year: targetYear,
        income: yearlyIncome,
        expense: yearlyExpense,
        net_income: yearlyIncome - yearlyExpense,
      });
    }

    const totalIncome = years.reduce((sum, y) => sum + y.income, 0);
    const totalExpense = years.reduce((sum, y) => sum + y.expense, 0);

    return {
      data: years,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_income: totalIncome - totalExpense,
        average_monthly_income: totalIncome / (years.length * 12),
        average_monthly_expense: totalExpense / (years.length * 12),
      },
    };
  }
}
