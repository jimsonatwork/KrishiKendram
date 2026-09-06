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
} from '@nestjs/common'

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard'

import {
  RolesGuard,
} from '../auth/guards/roles.guard'

import {
  Roles,
} from '../auth/decorators/roles.decorator'

import {
  UserRole,
} from '@prisma/client'

import {
  UsersService,
} from './users.service'

import {
  UpdateUserDto,
} from './dto/update-user.dto'

// ============================================================
// PART 01 END
// ============================================================


// ============================================================
// PART 02 - USERS CONTROLLER
// ============================================================

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // ==========================================================
  // PART 02A - CURRENT USER
  // ==========================================================

  @Get('me')
  async getMe(
    @Req() req: any,
  ) {
    return this.usersService.findById(
      req.user.id,
    )
  }

  // ==========================================================
  // PART 02A END
  // ==========================================================


  // ==========================================================
  // PART 02B - RECENT ACTIVITY
  // ==========================================================

  @Get('activity/recent')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async getRecentActivity(
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getRecentActivity(
      limit
        ? Number(limit)
        : 50,
    )
  }

  // ==========================================================
  // PART 02B END
  // ==========================================================


  // ==========================================================
  // PART 02C - USER ACTIVITY
  // ==========================================================

  @Get(':id/activity')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async getActivity(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getActivity(
      id,
      limit
        ? Number(limit)
        : 50,
    )
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
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async getHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getHistory(
      id,
      limit
        ? Number(limit)
        : 10,
    )
  }

  // ==========================================================
  // PART 02D END
  // ==========================================================


  // ==========================================================
  // PART 02E - USER LIST
  // ==========================================================

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async findAll() {
    return this.usersService.findAll()
  }

  // ==========================================================
  // PART 02E END
  // ==========================================================


  // ==========================================================
  // PART 02F - CREATE USER
  // ==========================================================

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async create(
    @Body()
    data: {
      name: string
      email: string
      password: string
    },
    @Req() req: any,
  ) {
    return this.usersService.create(
      data,
      req.user.id,
    )
  }

  // ==========================================================
  // PART 02F END
  // ==========================================================


  // ==========================================================
  // PART 02G - UPDATE USER
  // ==========================================================

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(
      id,
      dto,
      req.user.id,
    )
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
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async restoreVersion(
    @Param('id') id: string,
    @Param(
      'version',
      ParseIntPipe,
    )
    version: number,
    @Req() req: any,
  ) {
    return this.usersService.restoreVersion(
      id,
      version,
      req.user.id,
    )
  }

  // ==========================================================
  // PART 02H END
  // ==========================================================


  // ==========================================================
  // PART 02I - RESTORE PENDING DELETE USER
  // ==========================================================

  @Post(':id/restore')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async restore(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.usersService.restore(
      id,
      req.user.id,
    )
  }

  // ==========================================================
  // PART 02I END
  // ==========================================================


  // ==========================================================
  // PART 02J - BULK DELETE
  // ==========================================================

  @Delete('bulk')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async bulkDelete(
    @Body()
    body: {
      userIds: string[]
    },
    @Req() req: any,
  ) {
    return this.usersService.bulkDelete(
      body.userIds,
      req.user.id,
    )
  }

  // ==========================================================
  // PART 02J END
  // ==========================================================
}

// ============================================================
// PART 02 END
// ============================================================