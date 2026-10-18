import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LivestockRecordsService } from './livestock-records.service';
import { CreateLivestockRecordDto } from './dto/create-livestock-record.dto';

@Controller('livestock')
@UseGuards(JwtAuthGuard)
export class LivestockRecordsController {
  constructor(private readonly records: LivestockRecordsService) {}
  @Get(':id/records') list(@Req() req: any, @Param('id') id: string) { return this.records.list(req.user.userId, req.user.role, id); }
  @Post(':id/records') create(@Req() req: any, @Param('id') id: string, @Body() dto: CreateLivestockRecordDto) { return this.records.create(req.user.userId, req.user.role, id, dto); }
}
