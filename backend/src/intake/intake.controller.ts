import {
  Body,
  Controller,
  Post,
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
    @Body() dto: CreateIntakeDto,
  ) {
    return this.intakeService.create(dto);
  }
}