import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateBudgetDto, UpdateBudgetDto, QueryBudgetDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: QueryBudgetDto) {
    const period = query.period || this.getCurrentPeriod();

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        period,
        isActive: true,
      },
      orderBy: { category: 'asc' },
    });

    // Calculate spent for each budget from transactions
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.calculateSpent(userId, budget.category, period);
        const limit = Number(budget.limitAmount);
        const remaining = limit - spent;
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;

        return {
          id: budget.id,
          category: budget.category,
          icon: budget.icon,
          limit,
          spent,
          remaining,
          color: budget.color,
          period: budget.period,
          percentage: Number(percentage.toFixed(2)),
        };
      }),
    );

    // Calculate summary
    const totalBudget = budgetsWithSpent.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    return {
      data: budgetsWithSpent,
      summary: {
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_remaining: totalRemaining,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budget) {
      throw new NotFoundException('Budget tidak ditemukan');
    }

    const spent = await this.calculateSpent(userId, budget.category, budget.period);
    const limit = Number(budget.limitAmount);
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      id: budget.id,
      category: budget.category,
      icon: budget.icon,
      limit,
      spent,
      remaining,
      color: budget.color,
      period: budget.period,
      percentage: Number(percentage.toFixed(2)),
      is_active: budget.isActive,
    };
  }

  async create(userId: string, dto: CreateBudgetDto) {
    // Check if budget already exists for same category and period
    const existing = await this.prisma.budget.findUnique({
      where: {
        userId_category_period: {
          userId,
          category: dto.category,
          period: dto.period,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Budget untuk kategori dan periode ini sudah ada');
    }

    const budget = await this.prisma.budget.create({
      data: {
        userId,
        category: dto.category,
        icon: dto.icon || 'wallet',
        limitAmount: new Decimal(dto.limit),
        color: dto.color || '#4f46e5',
        period: dto.period,
      },
    });

    const spent = await this.calculateSpent(userId, budget.category, budget.period);
    const limit = Number(budget.limitAmount);
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      id: budget.id,
      category: budget.category,
      icon: budget.icon,
      limit,
      spent,
      remaining,
      color: budget.color,
      period: budget.period,
      percentage: Number(percentage.toFixed(2)),
    };
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const existing = await this.prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Budget tidak ditemukan');
    }

    // Check for duplicate if category is being changed
    if (dto.category && dto.category !== existing.category) {
      const duplicate = await this.prisma.budget.findUnique({
        where: {
          userId_category_period: {
            userId,
            category: dto.category,
            period: existing.period,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Budget untuk kategori ini sudah ada di periode yang sama');
      }
    }

    const budget = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.category && { category: dto.category }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.limit !== undefined && { limitAmount: new Decimal(dto.limit) }),
        ...(dto.color && { color: dto.color }),
        ...(dto.is_active !== undefined && { isActive: dto.is_active }),
      },
    });

    const spent = await this.calculateSpent(userId, budget.category, budget.period);
    const limit = Number(budget.limitAmount);
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      id: budget.id,
      category: budget.category,
      icon: budget.icon,
      limit,
      spent,
      remaining,
      color: budget.color,
      period: budget.period,
      percentage: Number(percentage.toFixed(2)),
      is_active: budget.isActive,
    };
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Budget tidak ditemukan');
    }

    await this.prisma.budget.delete({
      where: { id },
    });

    return { message: 'Budget berhasil dihapus' };
  }

  private async calculateSpent(userId: string, category: string, period: string): Promise<number> {
    const [year, month] = period.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        category,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount) || 0;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
}
