import { BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService - centralized field policy', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const jwtService = {} as any;

  const registry = {
    validateResourceField: jest.fn(),
      validateField: jest.fn().mockReturnValue({
        valid: true,
        value: undefined,
        errors: [],
      }),
  } as any;

  const auditService = {
    create: jest.fn(),
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prisma,
      jwtService,
      registry,
      auditService,
    );
  });

  it('uses Registry-normalized registration fields', async () => {
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
      })
      .mockReturnValueOnce({
        valid: true,
        value: '+919999999999',
        errors: [],
      })
      .mockReturnValueOnce({
        valid: true,
        value: 'en',
        errors: [],
      });

    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Normalized Name',
      email: 'normalized@example.com',
      mobile: '+919999999999',
      preferredLanguage: 'en',
      preferredInputMethod: 'MIXED',
      passwordHash: 'secret-hash',
      role: 'FARMER',
      status: 'PENDING',
    });

    const result = await service.register({
      name: '  Original Name  ',
      email: '  ORIGINAL@EXAMPLE.COM  ',
      mobile: ' +919999999999 ',
      password: 'password123',
      preferredLanguage: ' en ',
    } as any);

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

    expect(
      registry.validateResourceField,
    ).toHaveBeenNthCalledWith(
      3,
      'user',
      'mobile',
      ' +919999999999 ',
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenNthCalledWith(
      4,
      'user',
      'preferredLanguage',
      ' en ',
    );

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Normalized Name',
        email: 'normalized@example.com',
        mobile: '+919999999999',
        preferredLanguage: 'en',
        passwordHash: expect.any(String),
      }),
    });

    expect(result).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('turns an invalid Registry name result into BadRequestException', async () => {
    registry.validateResourceField.mockReturnValue({
      valid: false,
      value: '',
      errors: ['Field is required.'],
    });

    await expect(
      service.register({
        name: '',
        password: 'password123',
      } as any),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.user.create,
    ).not.toHaveBeenCalled();
  });

  it('turns an invalid Registry email result into BadRequestException', async () => {
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
      service.register({
        name: 'Valid Name',
        email: 'invalid',
        password: 'password123',
      } as any),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.user.create,
    ).not.toHaveBeenCalled();
  });
  it('updates lastSeenAt and returns the safe current user profile', async () => {
    const lastSeenAt = new Date();

    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Jimson',
      email: 'jimson@example.com',
      mobile: '+919999999999',
      role: 'FARMER',
      status: 'ACTIVE',
      preferredLanguage: 'en',
      preferredInputMethod: 'MIXED',
      profileCompletion: 80,
      isVerified: true,
      lastLoginAt: lastSeenAt,
      lastSeenAt,
      createdAt: lastSeenAt,
      updatedAt: lastSeenAt,
    });

    const result = await service.me('user-1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        lastSeenAt: expect.any(Date),
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        preferredLanguage: true,
        preferredInputMethod: true,
        profileCompletion: true,
        isVerified: true,
        lastLoginAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-1',
        name: 'Jimson',
        email: 'jimson@example.com',
      }),
    );
  });

});
