import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CropsService } from './crops.service';

import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('crops')
@UseGuards(JwtAuthGuard)
export class CropsController {
  constructor(
    private readonly cropsService: CropsService,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateCropDto,
  ) {
    return this.cropsService.create(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Get()
  findMyCrops(
    @Req() req: any,
  ) {
    return this.cropsService.findMyCrops(
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.cropsService.findOne(
      req.user.userId,
      req.user.role,
      id,
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCropDto,
  ) {
    return this.cropsService.update(
      req.user.userId,
      req.user.role,
      id,
      dto,
    );
  }

  @Delete(':id')
  archive(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.cropsService.archive(
      req.user.userId,
      req.user.role,
      id,
    );
  }
}
