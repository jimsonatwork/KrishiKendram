import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateIntakeDto } from './dto/create-intake.dto';
import { TranslateIntakeDto } from './dto/translate-intake.dto';
import { IntakeTranslationService } from './intake-translation.service';
import { IntakeService } from './intake.service';

@Controller('intake')
@UseGuards(JwtAuthGuard)
export class IntakeController {
  constructor(
    private readonly intakeService: IntakeService,
    private readonly translationService: IntakeTranslationService,
  ) {}

  @Post('translate')
  translate(@Req() req: any, @Body() dto: TranslateIntakeDto) {
    return this.translationService.translate(req.user.userId, dto);
  }

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