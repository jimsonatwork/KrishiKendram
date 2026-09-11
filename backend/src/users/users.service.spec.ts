import { BadRequestException } from '@nestjs/common';

import { UsersService } from './users.service';

describe('UsersService - centralized field policy', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback) =>
      callback(prisma),
    ),
  } as any;

  const registry = {
    validateResourceField: jest.fn(),
    validateField: jest.fn(),
  } as any;

  const auditService = {
    create: jest.fn(),
  } as any;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      name: 'Test User',
      email: 'test@example.com',
      status: 'ACTIVE',
      role: 'FARMER',
    });

    registry.validateField.mockReturnValue({
      valid: true,
      value: 'password123',
      errors: [],
    });

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

  it('rejects a password shorter than the canonical minimum', async () => {
    registry.validateResourceField
      .mockReturnValueOnce({
        valid: true,
        value: 'Valid Name',
        errors: [],
      })
      .mockReturnValueOnce({
        valid: true,
        value: 'valid@example.com',
        errors: [],
      });

    registry.validateField.mockReturnValue({
      valid: false,
      value: '1234567',
      errors: [
        'Field must be at least 8 characters long.',
      ],
    });

    await expect(
      service.create({
        name: 'Valid Name',
        email: 'valid@example.com',
        password: '1234567',
      }),
    ).rejects.toThrow(
      'Field must be at least 8 characters long.',
    );

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('accepts a password that satisfies the canonical minimum', async () => {
    registry.validateResourceField
      .mockReturnValueOnce({
        valid: true,
        value: 'Valid Name',
        errors: [],
      })
      .mockReturnValueOnce({
        valid: true,
        value: 'valid@example.com',
        errors: [],
      });

    registry.validateField.mockReturnValue({
      valid: true,
      value: '12345678',
      errors: [],
    });

    await service.create({
      name: 'Valid Name',
      email: 'valid@example.com',
      password: '12345678',
    });

    expect(registry.validateField).toHaveBeenCalledWith(
      'userPassword',
      '12345678',
    );

    expect(prisma.user.create).toHaveBeenCalled();
  });


  it('rejects an invalid password during update', async () => {
    registry.validateField.mockReturnValue({
      valid: false,
      value: '1234567',
      errors: [
        'Field must be at least 8 characters long.',
      ],
    });

    await expect(
      service.update(
        'user-id',
        {
          password: '1234567',
        },
        'actor-id',
      ),
    ).rejects.toThrow(
      'Field must be at least 8 characters long.',
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
  });


});
