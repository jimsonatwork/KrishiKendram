import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { FarmsService } from './farms.service';

import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreateFarmAssetDto } from './dto/create-farm-asset.dto';
import { CreateFarmRecordDto } from './dto/create-farm-record.dto';
import { TransferResourceDto } from './dto/transfer-resource.dto';
import { SplitFarmAssetDto } from './dto/split-farm-asset.dto';

@Controller('farms')
@UseGuards(JwtAuthGuard)
export class FarmsController {
  constructor(
    private readonly farmsService: FarmsService,
  ) {}

  @Post()
create(
  @CurrentUser() user: any,
  @Body() dto: CreateFarmDto,
) {
  return this.farmsService.create(
    user.userId,
    user.role as UserRole,
    dto,
  );
}

  @Get('my')
  myFarms(
    @CurrentUser() user: any,
  ) {
    return this.farmsService.findMyFarms(
      user.userId,
      user.role as UserRole,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.findOne(
      id,
      user.userId,
      user.role as UserRole,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateFarmDto,
  ) {
    return this.farmsService.update(
      id,
      user.userId,
      user.role as UserRole,
      dto,
    );
  }

  @Get(':id/movements/history')
  getFarmMovementHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.getFarmMovementHistory(
      id,
      user.userId,
      user.role as UserRole,
    );
  }

  @Get(':id/evidence/history')
  getFarmEvidenceHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.getFarmEvidenceHistory(
      id,
      user.userId,
      user.role as UserRole,
    );
  }

  @Post(':id/transfer')
  transferFarm(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: TransferResourceDto,
  ) {
    return this.farmsService.transferFarm(
      id,
      dto,
      user.userId,
      user.role as UserRole,
    );
  }

  @Get(':farmId/assets/:assetId/relationships/history')
  getAssetRelationshipHistory(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.getFarmAssetRelationshipHistory(
      farmId,
      assetId,
      user.userId,
      user.role as UserRole,
    );
  }

  @Post(':id/assets')
  addAsset(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateFarmAssetDto,
  ) {
    return this.farmsService.addAsset(
      id,
      dto,
      user.userId,
      user.role as UserRole,
    );
  }

  @Get(':farmId/assets/:assetId/movements/history')
  getAssetMovementHistory(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.getFarmAssetMovementHistory(
      farmId,
      assetId,
      user.userId,
      user.role as UserRole,
    );
  }

  @Get(':farmId/assets/:assetId/evidence/history')
  getAssetEvidenceHistory(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.getFarmAssetEvidenceHistory(
      farmId,
      assetId,
      user.userId,
      user.role as UserRole,
    );
  }

  @Post(':farmId/assets/:assetId/transfer')
  transferAsset(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
    @Body() dto: TransferResourceDto,
  ) {
    return this.farmsService.transferFarmAsset(
      farmId,
      assetId,
      dto,
      user.userId,
      user.role as UserRole,
    );
  }

  @Get(':farmId/assets/:assetId/lineage/history')
  getAssetLineageHistory(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.getFarmAssetLineageHistory(
      farmId,
      assetId,
      user.userId,
      user.role as UserRole,
    );
  }

  @Post(':farmId/assets/:assetId/split')
  splitAsset(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
    @Body() dto: SplitFarmAssetDto,
  ) {
    return this.farmsService.splitFarmAsset(
      farmId,
      assetId,
      dto,
      user.userId,
      user.role as UserRole,
    );
  }

  @Patch(':farmId/assets/:assetId')
  updateAsset(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateFarmAssetDto,
  ) {
    return this.farmsService.updateAsset(
      farmId,
      assetId,
      dto,
      user.userId,
      user.role as UserRole,
    );
  }

  @Delete(':farmId/assets/:assetId')
  removeAsset(
    @Param('farmId') farmId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.removeAsset(
      farmId,
      assetId,
      user.userId,
      user.role as UserRole,
    );
  }

  @Post(':id/records')
  addRecord(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateFarmRecordDto,
  ) {
    return this.farmsService.addRecord(
      id,
      dto,
      user.userId,
      user.role as UserRole,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.farmsService.remove(
      id,
      user.userId,
      user.role as UserRole,
    );
  }
}
