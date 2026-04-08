import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdatePreferencesDto } from './dto';

@Injectable()
export class PreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    const preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences if not exists
      const newPreferences = await this.prisma.userPreference.create({
        data: {
          userId,
          currency: 'IDR',
          language: 'id',
          theme: 'system',
        },
      });

      return {
        currency: newPreferences.currency,
        language: newPreferences.language,
        theme: newPreferences.theme,
      };
    }

    return {
      currency: preferences.currency,
      language: preferences.language,
      theme: preferences.theme,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const preferences = await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.language && { language: dto.language }),
        ...(dto.theme && { theme: dto.theme }),
      },
      create: {
        userId,
        currency: dto.currency || 'IDR',
        language: dto.language || 'id',
        theme: dto.theme || 'system',
      },
    });

    return {
      currency: preferences.currency,
      language: preferences.language,
      theme: preferences.theme,
    };
  }
}
