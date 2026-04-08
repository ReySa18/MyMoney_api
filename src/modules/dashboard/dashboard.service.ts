import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Get total balance from all active accounts
    const accounts = await this.prisma.account.aggregate({
      where: { userId, isArchived: false },
      _sum: { balance: true },
    });
    const totalBalance = Number(accounts._sum.balance) || 0;

    // Get current month income/expense
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

    const [currentIncome, currentExpense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthlyIncome = Number(currentIncome._sum.amount) || 0;
    const monthlyExpense = Number(currentExpense._sum.amount) || 0;
    const netSavings = monthlyIncome - monthlyExpense;

    // Get previous month total balance change
    const previousMonthStart = new Date(previousYear, previousMonth, 1);
    const previousMonthEnd = new Date(previousYear, previousMonth + 1, 0);

    const [prevIncome, prevExpense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          date: { gte: previousMonthStart, lte: previousMonthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          date: { gte: previousMonthStart, lte: previousMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const prevNetSavings = (Number(prevIncome._sum.amount) || 0) - (Number(prevExpense._sum.amount) || 0);
    const balanceChangePercentage = prevNetSavings !== 0
      ? ((netSavings - prevNetSavings) / Math.abs(prevNetSavings)) * 100
      : 0;

    return {
      total_balance: totalBalance,
      monthly_income: monthlyIncome,
      monthly_expense: monthlyExpense,
      balance_change_percentage: Number(balanceChangePercentage.toFixed(2)),
      net_savings: netSavings,
      month: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`,
    };
  }

  async getCashflow(userId: string) {
    const now = new Date();
    const months: { month: string; income: number; expense: number }[] = [];

    // Get last 6 months data
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

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

      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      months.push({
        month: monthNames[targetDate.getMonth()],
        income: Number(income._sum.amount) || 0,
        expense: Number(expense._sum.amount) || 0,
      });
    }

    return { data: months };
  }

  async getExpenseCategories(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Get expense transactions grouped by category
    const expenses = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId,
        type: 'expense',
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    const totalExpense = expenses.reduce(
      (sum, e) => sum + (Number(e._sum.amount) || 0),
      0,
    );

    // Default colors for categories
    const categoryColors: Record<string, string> = {
      'Makanan & Minuman': '#3525cd',
      'Transportasi': '#006c49',
      'Tagihan': '#4f46e5',
      'Belanja': '#f59e0b',
      'Hiburan': '#960014',
      'Kesehatan': '#6cf8bb',
    };

    const data = expenses.map((e, index) => {
      const amount = Number(e._sum.amount) || 0;
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      
      return {
        name: e.category,
        percentage: Number(percentage.toFixed(0)),
        amount,
        color: categoryColors[e.category] || this.getColorByIndex(index),
      };
    });

    return {
      data,
      period: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`,
    };
  }

  private getColorByIndex(index: number): string {
    const colors = ['#3525cd', '#006c49', '#4f46e5', '#f59e0b', '#960014', '#6cf8bb', '#ec4899', '#8b5cf6'];
    return colors[index % colors.length];
  }
}
