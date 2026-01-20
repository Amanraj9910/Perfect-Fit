import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisModule } from './redis/redis.module';

@Module({
    imports: [AuthModule, UsersModule, RedisModule],
    providers: [PrismaService],
    exports: [PrismaService],
})
export class AppModule { }
