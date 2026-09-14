import { UserRole, InputMethod } from '@prisma/client';

import {
  AuthorizationAction,
} from '../platform/authorization/authorization.types';

import { IntakeService } from './intake.service';

describe('IntakeService', () => {
  let service: IntakeService;

  const prisma = {
    farm: {
      findUnique: jest.fn(),
    },
    crop: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    farmRecord: {
      create: jest.fn(),
    },
  } as any;

  const extractor = {
    extract: jest.fn(),
  } as any;

  const authorization = {
    assertCan: jest.fn(),
  } as any;

  const registry = {
    validateResourceField: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new IntakeService(
      prisma,
      extractor,
      authorization,
      registry,
    );
  });

  it('creates a farm record from extracted intake data', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    extractor.extract.mockResolvedValue({
      raw: 'general farm observation',
      category: 'GENERAL',
    });

    registry.validateResourceField
      .mockImplementation(
        (
          resource: string,
          field: string,
          value: unknown,
        ) => ({
          valid: true,
          value,
          errors: [],
        }),
      );

    const record = {
      id: 'record-1',
      farmId: 'farm-1',
      category: 'GENERAL',
      title: 'AI Intake Record',
    };

    prisma.farmRecord.create.mockResolvedValue(record);

    const result = await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'general farm observation',
      },
    );

    expect(result).toEqual(record);

    expect(
      authorization.assertCan,
    ).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'farmRecord',
      action: AuthorizationAction.CREATE,
      farmId: 'farm-1',
      ownerId: 'user-1',
    });

    expect(prisma.farmRecord.create).toHaveBeenCalledWith({
      data: {
        farmId: 'farm-1',
        category: 'GENERAL',
        title: 'AI Intake Record',
        inputMethod: InputMethod.MANUAL,
        data: {
          raw: 'general farm observation',
          category: 'GENERAL',
        },
      },
    });
  });

  it('creates a Crop from a planting intake', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    extractor.extract.mockResolvedValue({
      raw: 'planted rice',
      category: 'PLANTING',
      crop: {
        name: 'Rice',
      },
      activity: {
        type: 'PLANTING',
        area: 2,
        unit: 'acres',
      },
    });

    prisma.crop.findFirst.mockResolvedValue(null);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Rice',
      errors: [],
    });

    prisma.crop.create.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    prisma.farmRecord.create.mockResolvedValue({
      id: 'record-1',
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'planted rice',
      },
    );

    expect(
      registry.validateResourceField,
    ).toHaveBeenCalledWith(
      'crop',
      'name',
      'Rice',
    );

    expect(prisma.crop.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        farmId: 'farm-1',
        name: 'Rice',
        area: 2,
        unit: 'acres',
      }),
    });

    expect(
      authorization.assertCan,
    ).toHaveBeenCalledWith({
      user: {
        userId: 'user-1',
        role: UserRole.FARMER,
      },
      module: 'farms',
      resource: 'crop',
      action: AuthorizationAction.CREATE,
      farmId: 'farm-1',
      ownerId: 'user-1',
    });
  });

  it('persists the normalized Crop name returned by Registry', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    extractor.extract.mockResolvedValue({
      raw: 'planted rice',
      category: 'PLANTING',
      crop: {
        name: '  Rice  ',
      },
    });

    prisma.crop.findFirst.mockResolvedValue(null);

    registry.validateResourceField.mockReturnValue({
      valid: true,
      value: 'Rice',
      errors: [],
    });

    prisma.crop.create.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    prisma.farmRecord.create.mockResolvedValue({
      id: 'record-1',
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'planted rice',
      },
    );

    expect(prisma.crop.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Rice',
      }),
    });
  });

  it('rejects an AI-created Crop when Registry rejects the name', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    extractor.extract.mockResolvedValue({
      raw: 'planted rice',
      category: 'PLANTING',
      crop: {
        name: 'Rice',
      },
    });

    prisma.crop.findFirst.mockResolvedValue(null);

    registry.validateResourceField.mockReturnValue({
      valid: false,
      value: 'Rice',
      errors: ['Field is invalid.'],
    });

    await expect(
      service.create(
        'user-1',
        UserRole.FARMER,
        {
          farmId: 'farm-1',
          inputMethod: InputMethod.MANUAL,
          content: 'planted rice',
        },
      ),
    ).rejects.toThrow('Field is invalid.');

    expect(prisma.crop.create).not.toHaveBeenCalled();
  });

  it('authorizes farm-record creation before extracting intake content', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    authorization.assertCan.mockImplementationOnce(async (request: any) => {
      expect(request).toEqual({
        user: {
          userId: 'user-1',
          role: UserRole.FARMER,
        },
        module: 'farms',
        resource: 'farmRecord',
        action: AuthorizationAction.CREATE,
        farmId: 'farm-1',
        ownerId: 'user-1',
      });

      expect(extractor.extract).not.toHaveBeenCalled();
    });

    extractor.extract.mockResolvedValue({
      raw: 'general farm observation',
      category: 'GENERAL',
    });

    registry.validateResourceField.mockImplementation(
      (
        resource: string,
        field: string,
        value: unknown,
      ) => ({
        valid: true,
        value,
        errors: [],
      }),
    );

    prisma.farmRecord.create.mockResolvedValue({
      id: 'record-1',
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'general farm observation',
      },
    );

    expect(extractor.extract).toHaveBeenCalledWith(
      'general farm observation',
    );
  });

  it('does not extract intake content when farm-record authorization is denied', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    authorization.assertCan.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      service.create(
        'user-1',
        UserRole.FARMER,
        {
          farmId: 'farm-1',
          inputMethod: InputMethod.MANUAL,
          content: 'sensitive farm content',
        },
      ),
    ).rejects.toThrow('Forbidden');

    expect(extractor.extract).not.toHaveBeenCalled();
    expect(prisma.farmRecord.create).not.toHaveBeenCalled();
    expect(prisma.crop.create).not.toHaveBeenCalled();
  });

  it('authorizes Crop creation before Registry validation', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    extractor.extract.mockResolvedValue({
      raw: 'planted rice',
      category: 'PLANTING',
      crop: {
        name: 'Rice',
      },
    });

    prisma.crop.findFirst.mockResolvedValue(null);

    registry.validateResourceField.mockImplementation(() => {
      expect(authorization.assertCan).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'crop',
          action: AuthorizationAction.CREATE,
        }),
      );

      return {
        valid: true,
        value: 'Rice',
        errors: [],
      };
    });

    prisma.crop.create.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    prisma.farmRecord.create.mockResolvedValue({
      id: 'record-1',
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'planted rice',
      },
    );
  });

  it('does not create a duplicate Crop for the same planting day', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    extractor.extract.mockResolvedValue({
      raw: 'planted rice',
      category: 'PLANTING',
      crop: {
        name: 'Rice',
      },
    });

    prisma.crop.findFirst.mockResolvedValue({
      id: 'existing-crop',
      name: 'Rice',
    });

    prisma.farmRecord.create.mockResolvedValue({
      id: 'record-1',
    });

    await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'planted rice',
      },
    );

    expect(prisma.crop.create).not.toHaveBeenCalled();
  });
});
