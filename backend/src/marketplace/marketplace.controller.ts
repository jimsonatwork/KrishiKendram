import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}
  @Get('listings') findPublished() { return this.marketplace.findPublished(); }
  @Get('listings/mine') @UseGuards(JwtAuthGuard) findMine(@Req() req: any) { return this.marketplace.findMine(req.user.userId, req.user.role); }
  @Post('listings') @UseGuards(JwtAuthGuard) create(@Req() req: any, @Body() dto: CreateListingDto) { return this.marketplace.create(req.user.userId, req.user.role, dto); }
  @Patch('listings/:id') @UseGuards(JwtAuthGuard) update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateListingDto) { return this.marketplace.update(req.user.userId, req.user.role, id, dto); }
  @Post('listings/:id/publish') @UseGuards(JwtAuthGuard) publish(@Req() req: any, @Param('id') id: string) { return this.marketplace.publish(req.user.userId, req.user.role, id); }
  @Delete('listings/:id') @UseGuards(JwtAuthGuard) archive(@Req() req: any, @Param('id') id: string) { return this.marketplace.archive(req.user.userId, req.user.role, id); }
}