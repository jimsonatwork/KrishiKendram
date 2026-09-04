import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateIntakeDto } from './dto/create-intake.dto';
import { IntakeService } from './intake.service';

@Controller('intake')
@UseGuards(JwtAuthGuard)
export class IntakeController {
  constructor(
    private readonly intakeService: IntakeService,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateIntakeDto,
  ) {
    return this.intakeService.create(
      req.user.userId,
      req.user.role,
      dto,
    );
  }
}