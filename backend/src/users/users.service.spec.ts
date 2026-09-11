import { BadRequestException } from '@nestjs/common';

import { UsersService } from './users.service';

describe('UsersService - centralized field policy', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as any;

  const registry = {
    validateResourceField: jest.fn(),
  } as any;

  const auditService = {
    create: jest.fn(),
  } as any;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new UsersService(
      prisma,
      registry,
      auditService,
    );
  });

  it('uses Registry-normalized name and email when creating a user', async () => {
    registry.validateResourceField
      .mockReturnValueOnce({
        valid: true,
        value: 'Normalized Name',
        errors: [],
      })
      .mockReturnValueOnce({
        valid: true,
        value: 'normalized@example.com',
        errors: [],
      });

    prisma.user.findFirst.mockResolvedValue(null);

    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Normalized Name',
      email: 'normalized@example.com',
      passwordHash: 'secret-hash',
      refreshTokenHash: null,
      role: 'FARMER',
      status: 'PENDING',
    });

    const result = await service.create({
      name: '  Original Name  ',
      email: '  ORIGINAL@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(
      registry.validateResourceField,
    ).toHaveBeenNthCalledWith(
      1,
      'user',
      'name',
      '  Original Name  ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenNthCalledWith(
      2,
      'user',
      'email',
      '  ORIGINAL@EXAMPLE.COM  ',
    );

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Normalized Name',
        email: 'normalized@example.com',
        passwordHash: expect.any(String),
        role: 'FARMER',
      }),
    });

    expect(result).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('rejects an invalid Registry name result', async () => {
    registry.validateResourceField.mockReturnValue({
      valid: false,
      value: '   ',
      errors: ['Field must contain at least 1 character.'],
    });

    await expect(
      service.create({
        name: '   ',
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.user.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects an invalid Registry email result', async () => {
    registry.validateResourceField
      .mockReturnValueOnce({
        valid: true,
        value: 'Valid Name',
        errors: [],
      })
      .mockReturnValueOnce({
        valid: false,
        value: 'invalid',
        errors: ['Field has an invalid format.'],
      });

    await expect(
      service.create({
        name: 'Valid Name',
        email: 'invalid',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.user.create,
    ).not.toHaveBeenCalled();
  });
});
