// ============================================================
// PART 01 - IMPORTS
// ============================================================

import { UsersController } from './users.controller';

// ============================================================
// PART 01 END
// ============================================================

// ============================================================
// PART 02 - USERS CONTROLLER AUTHORIZATION ORDERING
// ============================================================

describe('UsersController authorization ordering', () => {
  let controller: UsersController;

  const authorization = {
    assertCan: jest.fn(),
  };

  const usersService = {
    findById: jest.fn(),
    getRecentActivity: jest.fn(),
    getActivity: jest.fn(),
    getHistory: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    restoreVersion: jest.fn(),
    restore: jest.fn(),
    bulkDelete: jest.fn(),
  };

  const user = {
    id: 'user-1',
    userId: 'user-1',
    role: 'SUPER_ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authorization.assertCan.mockResolvedValue(undefined);

    usersService.findById.mockResolvedValue({
      id: 'user-1',
    });

    usersService.getRecentActivity.mockResolvedValue([]);

    usersService.getActivity.mockResolvedValue([]);

    usersService.getHistory.mockResolvedValue([]);

    usersService.findAll.mockResolvedValue([]);

    usersService.create.mockResolvedValue({
      id: 'created-user',
    });

    usersService.update.mockResolvedValue({
      id: 'user-2',
    });

    usersService.restoreVersion.mockResolvedValue({
      id: 'user-2',
    });

    usersService.restore.mockResolvedValue({
      id: 'user-2',
    });

    usersService.bulkDelete.mockResolvedValue({
      deleted: 1,
    });

    controller = new UsersController(
      usersService as any,
      authorization as any,
    );
  });

  // ==========================================================
  // PART 02A - READ ROUTES
  // ==========================================================

  it('authorizes current-user lookup before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.findById.mockImplementationOnce(async () => {
      events.push('service');
      return { id: user.id };
    });

    await controller.getMe({
      user,
    });

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes recent activity before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.getRecentActivity.mockImplementationOnce(
      async () => {
        events.push('service');
        return [];
      },
    );

    await controller.getRecentActivity(
      { user },
      '20',
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes user activity before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.getActivity.mockImplementationOnce(
      async () => {
        events.push('service');
        return [];
      },
    );

    await controller.getActivity(
      { user },
      'user-2',
      '20',
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes user history before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.getHistory.mockImplementationOnce(
      async () => {
        events.push('service');
        return [];
      },
    );

    await controller.getHistory(
      { user },
      'user-2',
      '10',
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes user list before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.findAll.mockImplementationOnce(async () => {
      events.push('service');
      return [];
    });

    await controller.findAll({
      user,
    });

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  // ==========================================================
  // PART 02A END
  // ==========================================================

  // ==========================================================
  // PART 02B - WRITE / ADMIN ROUTES
  // ==========================================================

  it('authorizes user creation before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.create.mockImplementationOnce(
      async () => {
        events.push('service');
        return { id: 'created-user' };
      },
    );

    await controller.create(
      {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      } as any,
      { user },
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes user update before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.update.mockImplementationOnce(
      async () => {
        events.push('service');
        return { id: 'user-2' };
      },
    );

    await controller.update(
      'user-2',
      {} as any,
      { user },
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes history restore before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.restoreVersion.mockImplementationOnce(
      async () => {
        events.push('service');
        return { id: 'user-2' };
      },
    );

    await controller.restoreVersion(
      'user-2',
      3,
      { user },
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes pending-delete restore before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.restore.mockImplementationOnce(
      async () => {
        events.push('service');
        return { id: 'user-2' };
      },
    );

    await controller.restore(
      'user-2',
      { user },
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  it('authorizes bulk deletion before service access', async () => {
    const events: string[] = [];

    authorization.assertCan.mockImplementationOnce(async () => {
      events.push('authorize');
    });

    usersService.bulkDelete.mockImplementationOnce(
      async () => {
        events.push('service');
        return { deleted: 1 };
      },
    );

    await controller.bulkDelete(
      {
        userIds: ['user-2'],
      },
      { user },
    );

    expect(events).toEqual([
      'authorize',
      'service',
    ]);
  });

  // ==========================================================
  // PART 02B END
  // ==========================================================

  // ==========================================================
  // PART 03 - DENIAL MUST STOP SERVICE
  // ==========================================================

  it('does not access current-user service when authorization is denied', async () => {
    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      controller.getMe({
        user,
      }),
    ).rejects.toThrow('Forbidden');

    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('does not access user creation service when authorization is denied', async () => {
    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      controller.create(
        {
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
        } as any,
        { user },
      ),
    ).rejects.toThrow('Forbidden');

    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('does not access user update service when authorization is denied', async () => {
    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      controller.update(
        'user-2',
        {} as any,
        { user },
      ),
    ).rejects.toThrow('Forbidden');

    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('does not access bulk deletion service when authorization is denied', async () => {
    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      controller.bulkDelete(
        {
          userIds: ['user-2'],
        },
        { user },
      ),
    ).rejects.toThrow('Forbidden');

    expect(usersService.bulkDelete).not.toHaveBeenCalled();
  });

  // ==========================================================
  // PART 03 END
  // ==========================================================
});

// ============================================================
// PART 04 END
// ============================================================
