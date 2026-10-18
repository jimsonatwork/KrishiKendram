import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get('items') list(@Req() req: any) { return this.inventory.list(req.user.userId, req.user.role); }
  @Post('items') create(@Req() req: any, @Body() dto: CreateInventoryItemDto) { return this.inventory.create(req.user.userId, req.user.role, dto); }
  @Get('items/:id') findOne(@Req() req: any, @Param('id') id: string) { return this.inventory.findOne(req.user.userId, req.user.role, id); }
  @Patch('items/:id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInventoryItemDto) { return this.inventory.update(req.user.userId, req.user.role, id, dto); }
  @Delete('items/:id') archive(@Req() req: any, @Param('id') id: string) { return this.inventory.archive(req.user.userId, req.user.role, id); }
  @Post('items/:id/transactions') recordTransaction(@Req() req: any, @Param('id') id: string, @Body() dto: CreateInventoryTransactionDto) { return this.inventory.recordTransaction(req.user.userId, req.user.role, id, dto); }
  @Get('items/:id/transactions') history(@Req() req: any, @Param('id') id: string) { return this.inventory.history(req.user.userId, req.user.role, id); }
}
