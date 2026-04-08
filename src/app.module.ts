import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

// Core modules
import { PrismaModule } from './prisma';
import { HttpExceptionFilter } from './common/filters';
import { JwtAuthGuard } from './common/guards';

// Feature modules
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { PreferencesModule } from './modules/preferences';
import { AccountsModule } from './modules/accounts';
import { TransactionsModule } from './modules/transactions';
import { AssetsModule } from './modules/assets';
import { BudgetsModule } from './modules/budgets';
import { DashboardModule } from './modules/dashboard';
import { ReportsModule } from './modules/reports';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('UPSTASH_REDIS_URL') ?? configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = Number(configService.get<string>('REDIS_PORT', '6379'));

        const storage = redisUrl
          ? new ThrottlerStorageRedisService(
              new Redis(redisUrl, {
                enableReadyCheck: false,
                maxRetriesPerRequest: 1,
              }),
            )
          : redisHost
            ? new ThrottlerStorageRedisService(
                new Redis({
                  host: redisHost,
                  port: redisPort,
                }),
              )
            : undefined;

        return {
          throttlers: [
            {
              name: 'short',
              ttl: 1000,
              limit: 3,
            },
            {
              name: 'medium',
              ttl: 10000,
              limit: 20,
            },
            {
              name: 'long',
              ttl: 60000,
              limit: 100,
            },
          ],
          storage,
        };
      },
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    PreferencesModule,
    AccountsModule,
    TransactionsModule,
    AssetsModule,
    BudgetsModule,
    DashboardModule,
    ReportsModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
