import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../../prisma';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        joinDate: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatarUrl,
      phone: user.phone,
      join_date: user.joinDate.toISOString().split('T')[0],
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Check if email is being changed and already exists
    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email sudah digunakan');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        joinDate: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatarUrl,
      phone: user.phone,
      join_date: user.joinDate.toISOString().split('T')[0],
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipe file tidak didukung. Gunakan JPEG, PNG, GIF, atau WebP');
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Ukuran file maksimal 2MB');
    }

    try {
      // Upload to Cloudinary
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'mymoney/avatars',
              public_id: `user_${userId}`,
              overwrite: true,
              transformation: [
                { width: 256, height: 256, crop: 'fill', gravity: 'face' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as { secure_url: string });
            },
          )
          .end(file.buffer);
      });

      // Update user avatar URL
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: result.secure_url },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          phone: true,
          joinDate: true,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatarUrl,
        phone: user.phone,
        join_date: user.joinDate.toISOString().split('T')[0],
      };
    } catch (error) {
      throw new BadRequestException('Gagal mengupload avatar');
    }
  }
}
