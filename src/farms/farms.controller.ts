import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('farms')
@UseGuards(JwtAuthGuard)
export class FarmsController {
  constructor(
    private readonly farmsService: FarmsService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateFarmDto,
  ) {
    return this.farmsService.create(
      user.userId,
      dto,
    );
  }

  @Get('my')
  async findMyFarms(
    @CurrentUser() user: any,
  ) {
    return this.farmsService.findMyFarms(
      user.userId,
    );
  }
}