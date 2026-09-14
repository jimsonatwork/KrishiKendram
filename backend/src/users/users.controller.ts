// ============================================================
// PART 01 - IMPORTS
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AuthorizationService } from '../platform/authorization/authorization.service';

import { AuthorizationAction } from '../platform/authorization/authorization.types';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';

import { UpdateUserDto } from './dto/update-user.dto';

// ============================================================
// PART 01 END
// ============================================================

// ============================================================
// PART 02 - USERS CONTROLLER
// ============================================================

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // ==========================================================
  // PART 02A - CURRENT USER
  // ==========================================================

  @Get('me')
  async getMe(@Req() req: any) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.READ,
      ownerId: req.user.userId,
    });

    return this.usersService.findById(req.user.userId);
  }

  // ==========================================================
  // PART 02A END
  // ==========================================================

  // ==========================================================
  // PART 02B - RECENT ACTIVITY
  // ==========================================================

  @Get('activity/recent')
  async getRecentActivity(@Req() req: any, @Query('limit') limit?: string) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.READ_ACTIVITY,
    });

    return this.usersService.getRecentActivity(limit ? Number(limit) : 50);
  }

  // ==========================================================
  // PART 02B END
  // ==========================================================

  // ==========================================================
  // PART 02C - USER ACTIVITY
  // ==========================================================

  @Get(':id/activity')
  async getActivity(
    @Req() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.READ_ACTIVITY,
    });

    return this.usersService.getActivity(id, limit ? Number(limit) : 50);
  }

  // ==========================================================
  // PART 02C END
  // ==========================================================

  // ==========================================================
  // PART 02D - USER HISTORY
  // ==========================================================
  //
  // Returns safe history snapshots.
  // Password hashes are removed by UsersService before
  // this data reaches the frontend.
  //
  // This section is intentionally separate so future
  // history/undo changes can be made here without touching
  // normal user CRUD routes.
  //
  // ==========================================================

  @Get(':id/history')
  async getHistory(
    @Req() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.READ_HISTORY,
    });

    return this.usersService.getHistory(id, limit ? Number(limit) : 10);
  }

  // ==========================================================
  // PART 02D END
  // ==========================================================

  // ==========================================================
  // PART 02E - USER LIST
  // ==========================================================

  @Get()
  async findAll(@Req() req: any) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.READ,
    });

    return this.usersService.findAll();
  }

  // ==========================================================
  // PART 02E END
  // ==========================================================

  // ==========================================================
  // PART 02F - CREATE USER
  // ==========================================================

  @Post()
  async create(@Body() data: CreateUserDto, @Req() req: any) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.CREATE,
    });

    return this.usersService.create(data, req.user.userId);
  }

  // ==========================================================
  // PART 02F END
  // ==========================================================

  // ==========================================================
  // PART 02G - UPDATE USER
  // ==========================================================

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.UPDATE,
    });

    return this.usersService.update(id, dto, req.user.userId);
  }

  // ==========================================================
  // PART 02G END
  // ==========================================================

  // ==========================================================
  // PART 02H - RESTORE USER HISTORY VERSION / UNDO
  // ==========================================================
  //
  // Important:
  // UsersService.restoreVersion() uses the BEFORE snapshot
  // of the selected history entry.
  //
  // Therefore this endpoint means:
  //
  //     "Undo the change represented by this version"
  //
  // rather than:
  //
  //     "Jump to the exact after-state of this version".
  //
  // This distinction should also be reflected in the UI.
  //
  // ==========================================================

  @Post(':id/history/:version/restore')
  async restoreVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe)
    version: number,
    @Req() req: any,
  ) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.RESTORE,
    });

    return this.usersService.restoreVersion(id, version, req.user.userId);
  }

  // ==========================================================
  // PART 02H END
  // ==========================================================

  // ==========================================================
  // PART 02I - RESTORE PENDING DELETE USER
  // ==========================================================

  @Post(':id/restore')
  async restore(@Param('id') id: string, @Req() req: any) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.RESTORE,
    });

    return this.usersService.restore(id, req.user.userId);
  }

  // ==========================================================
  // PART 02I END
  // ==========================================================

  // ==========================================================
  // PART 02J - BULK DELETE
  // ==========================================================

  @Delete('bulk')
  async bulkDelete(
    @Body()
    body: {
      userIds: string[];
    },
    @Req() req: any,
  ) {
    await this.authorizationService.assertCan({
      user: req.user,
      module: 'platform',
      resource: 'user',
      action: AuthorizationAction.DELETE,
    });

    return this.usersService.bulkDelete(body.userIds, req.user.userId);
  }

  // ==========================================================
  // PART 02J END
  // ==========================================================
}

// ============================================================
// PART 02 END
// ============================================================
