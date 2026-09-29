import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLivestockDto } from './dto/create-livestock.dto';
import { UpdateLivestockDto } from './dto/update-livestock.dto';
import { LivestockService } from './livestock.service';

@Controller('livestock')
@UseGuards(JwtAuthGuard)
export class LivestockController {
  constructor(private readonly service: LivestockService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateLivestockDto) {
    return this.service.create(req.user.userId, req.user.role, dto);
  }

  @Get()
  findMine(@Req() req: any) {
    return this.service.findMine(req.user.userId, req.user.role);
  }

  @Get(':id/relationships/history')
  history(@Req() req: any, @Param('id') id: string) {
    return this.service.relationshipHistory(req.user.userId, req.user.role, id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.userId, req.user.role, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLivestockDto) {
    return this.service.update(req.user.userId, req.user.role, id, dto);
  }

  @Delete(':id')
  archive(@Req() req: any, @Param('id') id: string) {
    return this.service.archive(req.user.userId, req.user.role, id);
  }

  @Post(':id/restore')
  restore(@Req() req: any, @Param('id') id: string) {
    return this.service.restore(req.user.userId, req.user.role, id);
  }
}