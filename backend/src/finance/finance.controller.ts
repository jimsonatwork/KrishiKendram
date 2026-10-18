import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreateFinancialRecordDto } from './dto/create-financial-record.dto';
import { UpdateFinancialRecordDto } from './dto/update-financial-record.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get('records') list(@Req() req: any) { return this.finance.list(req.user.userId, req.user.role); }
  @Post('records') create(@Req() req: any, @Body() dto: CreateFinancialRecordDto) { return this.finance.create(req.user.userId, req.user.role, dto); }
  @Patch('records/:id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateFinancialRecordDto) { return this.finance.update(req.user.userId, req.user.role, id, dto); }
  @Delete('records/:id') archive(@Req() req: any, @Param('id') id: string) { return this.finance.archive(req.user.userId, req.user.role, id); }
}
