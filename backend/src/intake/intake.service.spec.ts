import { UserRole, InputMethod } from '@prisma/client';

import {
  AuthorizationAction,
} from '../platform/authorization/authorization.types';

import { IntakeService } from './intake.service';

describe('IntakeService', () => {
  let service: IntakeService;

  const transaction = {
    farm: {
      findUnique: jest.fn(),
    },
  } as any;

  const prisma = {
    farm: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
      return callback(transaction);
    }),
  } as any;

  const extractor = {
    extract: jest.fn(),
  } as any;

  const authorization = {
    assertCan: jest.fn(),
  } as any;

  const farmsService = {
    addRecord: jest.fn(),
    addRecordInTransaction: jest.fn(),
  } as any;

  const cropsService = {
    createFromIntake: jest.fn(),
    createFromIntakeInTransaction: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new IntakeService(
      prisma,
      extractor,
      authorization,
      farmsService,
      cropsService,
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

    const record = {
      id: 'record-1',
      farmId: 'farm-1',
      category: 'GENERAL',
      title: 'AI Intake Record',
    };

    farmsService.addRecordInTransaction.mockResolvedValue(record);

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

    expect(farmsService.addRecordInTransaction).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      {
        category: 'GENERAL',
        title: 'AI Intake Record',
        inputMethod: InputMethod.MANUAL,
        data: {
          raw: 'general farm observation',
          category: 'GENERAL',
          intakeMetadata: expect.objectContaining({
            originalContent: 'general farm observation',
            originalLanguage: 'en',
            englishTranslation: 'general farm observation',
            translationStatus: 'NOT_REQUIRED',
            inputMethod: InputMethod.MANUAL,
            capturedAt: expect.any(String),
          }),
        },
      },
      'user-1',
      UserRole.FARMER,
    );
  });

  it('delegates a planting Crop to the canonical CropsService mutation boundary', async () => {
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

    cropsService.createFromIntakeInTransaction.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    farmsService.addRecordInTransaction.mockResolvedValue({
      id: 'record-1',
    });

    const result = await service.create(
      'user-1',
      UserRole.FARMER,
      {
        farmId: 'farm-1',
        inputMethod: InputMethod.MANUAL,
        content: 'planted rice',
      },
    );
    expect(result).toMatchObject({ id: 'record-1', createdCrop: { id: 'crop-1', name: 'Rice' } });

    expect(cropsService.createFromIntakeInTransaction).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        name: 'Rice',
        area: 2,
        unit: 'acres',
        sowingDate: expect.any(Date),
      }),
      'user-1',
      UserRole.FARMER,
    );

  });

  it('passes the extracted Crop name unchanged to CropsService', async () => {
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

    cropsService.createFromIntakeInTransaction.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    farmsService.addRecordInTransaction.mockResolvedValue({
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

    /*
     * Intake owns interpretation only.
     * Registry normalization belongs to CropsService.createFromIntake().
     */
    expect(cropsService.createFromIntakeInTransaction).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        name: '  Rice  ',
      }),
      'user-1',
      UserRole.FARMER,
    );
  });

  it('propagates Crop validation errors from CropsService', async () => {
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

    cropsService.createFromIntakeInTransaction.mockRejectedValue(
      new Error('Field is invalid.'),
    );

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

    expect(cropsService.createFromIntakeInTransaction).toHaveBeenCalled();
  });

  it('authorizes farm-record creation before extracting intake content', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    authorization.assertCan.mockImplementationOnce(
      async (request: any) => {
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
      },
    );

    extractor.extract.mockResolvedValue({
      raw: 'general farm observation',
      category: 'GENERAL',
    });

    farmsService.addRecordInTransaction.mockResolvedValue({
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
    expect(farmsService.addRecord).not.toHaveBeenCalled();
    expect(cropsService.createFromIntakeInTransaction).not.toHaveBeenCalled();
  });

  it('delegates Crop creation to the canonical transactional CropsService boundary', async () => {
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

    cropsService.createFromIntakeInTransaction.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    farmsService.addRecordInTransaction.mockResolvedValue({
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
      cropsService.createFromIntakeInTransaction,
    ).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        name: 'Rice',
      }),
      'user-1',
      UserRole.FARMER,
    );
  });

  it('uses one Prisma transaction for Crop and FarmRecord mutations', async () => {
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

    cropsService.createFromIntakeInTransaction.mockResolvedValue({
      id: 'crop-1',
      name: 'Rice',
    });

    farmsService.addRecordInTransaction.mockResolvedValue({
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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(
      cropsService.createFromIntakeInTransaction,
    ).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        name: 'Rice',
      }),
      'user-1',
      UserRole.FARMER,
    );

    expect(
      farmsService.addRecordInTransaction,
    ).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        category: 'PLANTING',
        title: 'AI Intake Record',
      }),
      'user-1',
      UserRole.FARMER,
    );
  });

  it('delegates duplicate Crop handling to CropsService', async () => {
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

    cropsService.createFromIntakeInTransaction.mockResolvedValue({
      id: 'existing-crop',
      name: 'Rice',
    });

    farmsService.addRecordInTransaction.mockResolvedValue({
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

    expect(cropsService.createFromIntakeInTransaction).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        name: 'Rice',
      }),
      'user-1',
      UserRole.FARMER,
    );
  });

  it('rejects non-English intake before extraction unless English meaning is confirmed', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });

    await expect(service.create('user-1', UserRole.FARMER, {
      farmId: 'farm-1',
      inputMethod: InputMethod.VOICE,
      content: 'నేను రెండు ఎకరాల్లో వరి నాటాను',
      originalContent: 'నేను రెండు ఎకరాల్లో వరి నాటాను',
      originalLanguage: 'te',
      englishTranslation: 'I planted paddy in two acres',
      translationConfirmed: false,
    })).rejects.toThrow('A non-English intake requires a reviewed English meaning');

    expect(extractor.extract).not.toHaveBeenCalled();
    expect(farmsService.addRecordInTransaction).not.toHaveBeenCalled();
  });

  it('extracts the confirmed English meaning and persists original-language provenance', async () => {
    prisma.farm.findUnique.mockResolvedValue({
      id: 'farm-1',
      ownerId: 'user-1',
    });
    extractor.extract.mockResolvedValue({
      raw: 'I planted paddy in two acres',
      category: 'GENERAL',
    });
    farmsService.addRecordInTransaction.mockResolvedValue({ id: 'record-1' });

    await service.create('user-1', UserRole.FARMER, {
      farmId: 'farm-1',
      inputMethod: InputMethod.VOICE,
      content: 'I planted paddy in two acres',
      originalContent: 'నేను రెండు ఎకరాల్లో వరి నాటాను',
      originalLanguage: 'te',
      englishTranslation: 'I planted paddy in two acres',
      translationConfirmed: true,
    });

    expect(extractor.extract).toHaveBeenCalledWith('I planted paddy in two acres');
    expect(farmsService.addRecordInTransaction).toHaveBeenCalledWith(
      transaction,
      'farm-1',
      expect.objectContaining({
        data: expect.objectContaining({
          intakeMetadata: expect.objectContaining({
            originalContent: 'నేను రెండు ఎకరాల్లో వరి నాటాను',
            originalLanguage: 'te',
            englishTranslation: 'I planted paddy in two acres',
            translationStatus: 'CONFIRMED',
            inputMethod: InputMethod.VOICE,
          }),
        }),
      }),
      'user-1',
      UserRole.FARMER,
    );
  });

});
