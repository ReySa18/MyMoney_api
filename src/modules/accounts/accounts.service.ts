import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateAccountDto, UpdateAccountDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        isArchived: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalBalance = accounts.reduce(
      (sum, account) => sum + Number(account.balance),
      0,
    );

    return {
      data: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        icon: account.icon,
        balance: Number(account.balance),
        color: account.color,
      })),
      total_balance: totalBalance,
    };
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Rekening tidak ditemukan');
    }

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      icon: account.icon,
      balance: Number(account.balance),
      color: account.color,
      is_archived: account.isArchived,
    };
  }

  async create(userId: string, dto: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        icon: dto.icon || 'landmark',
        balance: new Decimal(dto.balance),
        color: dto.color || '#4f46e5',
      },
    });

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      icon: account.icon,
      balance: Number(account.balance),
      color: account.color,
    };
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    // Check if account exists
    const existingAccount = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existingAccount) {
      throw new NotFoundException('Rekening tidak ditemukan');
    }

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.balance !== undefined && { balance: new Decimal(dto.balance) }),
        ...(dto.color && { color: dto.color }),
        ...(dto.is_archived !== undefined && { isArchived: dto.is_archived }),
      },
    });

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      icon: account.icon,
      balance: Number(account.balance),
      color: account.color,
      is_archived: account.isArchived,
    };
  }

  async remove(userId: string, id: string) {
    // Check if account exists
    const existingAccount = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existingAccount) {
      throw new NotFoundException('Rekening tidak ditemukan');
    }

    // Check if account has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id },
    });

    if (transactionCount > 0) {
      // Soft delete (archive) instead of hard delete
      await this.prisma.account.update({
        where: { id },
        data: { isArchived: true },
      });

      return { message: 'Rekening berhasil diarsipkan (memiliki transaksi)' };
    }

    // Hard delete if no transactions
    await this.prisma.account.delete({
      where: { id },
    });

    return { message: 'Rekening berhasil dihapus' };
  }
}
