import type { StringValue } from 'ms';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

useFactory: (config: ConfigService) => ({
  secret:
    config.getOrThrow<string>('JWT_SECRET'),

signOptions: {
  expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as StringValue,
},
}),
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService],

  exports: [AuthService, JwtModule],
})
export class AuthModule {}