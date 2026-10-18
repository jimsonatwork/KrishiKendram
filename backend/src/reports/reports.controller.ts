import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  getOverview(@Req() req: any, @Query() query: ReportQueryDto) {
    return this.reports.getOverview(req.user.userId, req.user.role, query);
  }
}
