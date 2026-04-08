import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateTransactionDto, UpdateTransactionDto, QueryTransactionDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: QueryTransactionDto) {
    const { page = 1, limit = 8, type, search, start_date, end_date, account_id, category } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && type !== 'all' && { type }),
      ...(search && {
        description: { contains: search, mode: 'insensitive' },
      }),
      ...(start_date && { date: { gte: new Date(start_date) } }),
      ...(end_date && { date: { lte: new Date(end_date) } }),
      ...(account_id && { accountId: account_id }),
      ...(category && { category }),
    };

    // Combine date filters if both exist
    if (start_date && end_date) {
      where.date = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        category: tx.category,
        category_icon: tx.categoryIcon,
        amount: Number(tx.amount),
        type: tx.type,
        date: tx.date.toISOString().split('T')[0],
        notes: tx.notes,
        account: {
          id: tx.account.id,
          name: tx.account.name,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return {
      id: transaction.id,
      description: transaction.description,
      category: transaction.category,
      category_icon: transaction.categoryIcon,
      amount: Number(transaction.amount),
      type: transaction.type,
      date: transaction.date.toISOString().split('T')[0],
      notes: transaction.notes,
      account: {
        id: transaction.account.id,
        name: transaction.account.name,
      },
    };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    // Verify account belongs to user
    const account = await this.prisma.account.findFirst({
      where: { id: dto.account_id, userId },
    });

    if (!account) {
      throw new BadRequestException('Rekening tidak ditemukan');
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId: dto.account_id,
          description: dto.description,
          category: dto.category,
          categoryIcon: dto.category_icon || 'banknote',
          amount: new Decimal(dto.amount),
          type: dto.type,
          date: new Date(dto.date),
          notes: dto.notes,
        },
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
      });

      // Update account balance
      const balanceChange = dto.type === 'income' 
        ? new Decimal(dto.amount) 
        : new Decimal(dto.amount).negated();

      await prisma.account.update({
        where: { id: dto.account_id },
        data: {
          balance: { increment: balanceChange },
        },
      });

      return transaction;
    });

    return {
      id: result.id,
      description: result.description,
      category: result.category,
      category_icon: result.categoryIcon,
      amount: Number(result.amount),
      type: result.type,
      date: result.date.toISOString().split('T')[0],
      notes: result.notes,
      account: {
        id: result.account.id,
        name: result.account.name,
      },
    };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    // Find existing transaction
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    // Use transaction for atomicity if amount or type changes
    const result = await this.prisma.$transaction(async (prisma) => {
      // Revert old balance change
      const oldBalanceChange = existing.type === 'income'
        ? existing.amount.negated()
        : existing.amount;

      await prisma.account.update({
        where: { id: existing.accountId },
        data: {
          balance: { increment: oldBalanceChange },
        },
      });

      // Update transaction
      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          ...(dto.description && { description: dto.description }),
          ...(dto.category && { category: dto.category }),
          ...(dto.category_icon && { categoryIcon: dto.category_icon }),
          ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
          ...(dto.type && { type: dto.type }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
      });

      // Apply new balance change
      const newAmount = dto.amount !== undefined ? new Decimal(dto.amount) : existing.amount;
      const newType = dto.type || existing.type;
      const newBalanceChange = newType === 'income' ? newAmount : newAmount.negated();

      await prisma.account.update({
        where: { id: existing.accountId },
        data: {
          balance: { increment: newBalanceChange },
        },
      });

      return transaction;
    });

    return {
      id: result.id,
      description: result.description,
      category: result.category,
      category_icon: result.categoryIcon,
      amount: Number(result.amount),
      type: result.type,
      date: result.date.toISOString().split('T')[0],
      notes: result.notes,
      account: {
        id: result.account.id,
        name: result.account.name,
      },
    };
  }

  async remove(userId: string, id: string) {
    // Find existing transaction
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    // Use transaction for atomicity
    await this.prisma.$transaction(async (prisma) => {
      // Revert balance change
      const balanceChange = existing.type === 'income'
        ? existing.amount.negated()
        : existing.amount;

      await prisma.account.update({
        where: { id: existing.accountId },
        data: {
          balance: { increment: balanceChange },
        },
      });

      // Delete transaction
      await prisma.transaction.delete({
        where: { id },
      });
    });

    return { message: 'Transaksi berhasil dihapus' };
  }
}
