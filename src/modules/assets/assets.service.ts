import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateAssetDto, UpdateAssetDto, CreateAssetHistoryDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
      orderBy: { value: 'desc' },
    });

    const totalValue = assets.reduce(
      (sum, asset) => sum + Number(asset.value),
      0,
    );

    // Recalculate allocations
    const assetsWithAllocation = assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      value: Number(asset.value),
      allocation: totalValue > 0 
        ? Number(((Number(asset.value) / totalValue) * 100).toFixed(2))
        : 0,
      change: Number(asset.change),
      icon: asset.icon,
      color: asset.color,
    }));

    return {
      data: assetsWithAllocation,
      total_value: totalValue,
    };
  }

  async findOne(userId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, userId },
      include: {
        history: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    // Calculate total for allocation
    const total = await this.prisma.asset.aggregate({
      where: { userId },
      _sum: { value: true },
    });
    const totalValue = Number(total._sum.value) || 0;

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      value: Number(asset.value),
      allocation: totalValue > 0
        ? Number(((Number(asset.value) / totalValue) * 100).toFixed(2))
        : 0,
      change: Number(asset.change),
      icon: asset.icon,
      color: asset.color,
      history: asset.history.map((h) => ({
        date: h.date,
        value: Number(h.value),
      })),
    };
  }

  async create(userId: string, dto: CreateAssetDto) {
    const asset = await this.prisma.asset.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        value: new Decimal(dto.value),
        icon: dto.icon || 'trending-up',
        color: dto.color || '#4f46e5',
      },
    });

    // Update allocations for all assets
    await this.recalculateAllocations(userId);

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      value: Number(asset.value),
      allocation: Number(asset.allocation),
      change: Number(asset.change),
      icon: asset.icon,
      color: asset.color,
    };
  }

  async update(userId: string, id: string, dto: UpdateAssetDto) {
    const existing = await this.prisma.asset.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.value !== undefined && { value: new Decimal(dto.value) }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.color && { color: dto.color }),
        ...(dto.change !== undefined && { change: new Decimal(dto.change) }),
      },
    });

    // Update allocations for all assets
    await this.recalculateAllocations(userId);

    // Get updated allocation
    const updated = await this.prisma.asset.findUnique({ where: { id } });

    return {
      id: updated!.id,
      name: updated!.name,
      type: updated!.type,
      value: Number(updated!.value),
      allocation: Number(updated!.allocation),
      change: Number(updated!.change),
      icon: updated!.icon,
      color: updated!.color,
    };
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.asset.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    await this.prisma.asset.delete({
      where: { id },
    });

    // Update allocations for remaining assets
    await this.recalculateAllocations(userId);

    return { message: 'Aset berhasil dihapus' };
  }

  async addHistory(userId: string, assetId: string, dto: CreateAssetHistoryDto) {
    // Verify asset belongs to user
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!asset) {
      throw new NotFoundException('Aset tidak ditemukan');
    }

    // Upsert history entry
    const history = await this.prisma.assetHistory.upsert({
      where: {
        assetId_date: {
          assetId,
          date: dto.date,
        },
      },
      update: {
        value: new Decimal(dto.value),
      },
      create: {
        assetId,
        date: dto.date,
        value: new Decimal(dto.value),
      },
    });

    // Calculate change from last 2 history entries
    const lastTwoHistory = await this.prisma.assetHistory.findMany({
      where: { assetId },
      orderBy: { date: 'desc' },
      take: 2,
    });

    if (lastTwoHistory.length === 2) {
      const currentValue = Number(lastTwoHistory[0].value);
      const previousValue = Number(lastTwoHistory[1].value);
      const change = previousValue > 0
        ? ((currentValue - previousValue) / previousValue) * 100
        : 0;

      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          value: new Decimal(currentValue),
          change: new Decimal(change.toFixed(4)),
        },
      });

      // Update allocations
      await this.recalculateAllocations(userId);
    }

    return {
      date: history.date,
      value: Number(history.value),
    };
  }

  private async recalculateAllocations(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
    });

    const totalValue = assets.reduce(
      (sum, asset) => sum + Number(asset.value),
      0,
    );

    for (const asset of assets) {
      const allocation = totalValue > 0
        ? (Number(asset.value) / totalValue) * 100
        : 0;

      await this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          allocation: new Decimal(allocation.toFixed(2)),
        },
      });
    }
  }
}
