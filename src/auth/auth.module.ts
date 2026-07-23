import type { StringValue } from 'ms';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

import { PassportModule } from '@nestjs/passport';

@Module({
imports: [
  ConfigModule,

  PassportModule.register({
    defaultStrategy: 'jwt',
  }),

  JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],

    useFactory: (config: ConfigService) => ({
      secret: config.get<string>('JWT_SECRET'),
      signOptions: {
        expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as any,
      },
    }),
  }),
],

  controllers: [AuthController],

  providers: [  AuthService,
  JwtStrategy],

 exports: [
  AuthService,
  JwtModule,
  PassportModule,
],
})
export class AuthModule {}