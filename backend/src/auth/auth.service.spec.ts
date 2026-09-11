import { BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService - centralized field policy', () => {
  const prisma = {
    user: {
      create: jest.fn(),
    },
  } as any;

  const jwtService = {} as any;

  const registry = {
    validateResourceField: jest.fn(),
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
});
