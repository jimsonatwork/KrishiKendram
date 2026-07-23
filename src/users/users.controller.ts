import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      email: string;
    },
  ) {
    return this.usersService.create({
      ...body,
      passwordHash: 'TEMP_HASH',
    });
  }
}