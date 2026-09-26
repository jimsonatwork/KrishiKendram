import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';
import { ResourceTransferRequestService } from './transfer-request.service';

@Controller('resource-transfers/requests')
@UseGuards(JwtAuthGuard)
export class ResourceTransferRequestController {
  constructor(private readonly transfers: ResourceTransferRequestService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTransferRequestDto) {
    return this.transfers.create(dto, user.userId, user.role as UserRole);
  }

  @Get('incoming')
  incoming(@CurrentUser() user: any) {
    return this.transfers.listIncoming(user.userId);
  }

  @Get('outgoing')
  outgoing(@CurrentUser() user: any) {
    return this.transfers.listOutgoing(user.userId);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transfers.accept(id, user.userId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transfers.reject(id, user.userId);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transfers.cancel(id, user.userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    return this.transfers.approve(
      id,
      user.userId,
      user.role as UserRole,
      reason,
    );
  }
}
