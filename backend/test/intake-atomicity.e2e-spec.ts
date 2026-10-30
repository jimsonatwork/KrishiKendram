import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';
import { IntakeService } from './../src/intake/intake.service';
import { FarmsService } from './../src/farms/farms.service';
import { CropsService } from './../src/crops/crops.service';

describe('Intake transaction atomicity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rolls back Crop + relationship + audit when FarmRecord DB write fails', async () => {
    const farm = await prisma.farm.findFirst({
      where: {
        deletedAt: null,
        owner: {
          status: 'ACTIVE',
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      },
      select: {
        id: true,
        ownerId: true,
        owner: { select: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    expect(farm).toBeTruthy();

    const intake = app.get(IntakeService);
    const farmsService = app.get(FarmsService);
    const cropsService = app.get(CropsService);

    const uniqueName = `Atomicity Rollback Rice ${Date.now()}`;
    let createdCropId: string | undefined;

    const originalCreate =
      cropsService.createFromIntakeInTransaction.bind(cropsService);

    jest
      .spyOn(cropsService, 'createFromIntakeInTransaction')
      .mockImplementation(async (
        tx: any,
        farmId: string,
        input: any,
        userId: string,
        role: any,
      ) => {
        const crop = await originalCreate(
          tx,
          farmId,
          input,
          userId,
          role,
        );
        createdCropId = crop.id;
        return crop;
      });

    jest
      .spyOn(farmsService, 'addRecordInTransaction')
      .mockImplementation(async (
        tx: any,
        _farmId: string,
        dto: any,
      ) => {
        await tx.farmRecord.create({
          data: {
            farmId: '__atomicity_missing_farm__',
            category: dto.category,
            inputMethod: dto.inputMethod,
            data: dto.data,
            title: dto.title ?? null,
          },
        });

        throw new Error('INTENTIONAL_ATOMICITY_TEST_FAILURE');
      });

    try {
      await expect(
        intake.create(
          farm!.ownerId,
          farm!.owner.role,
          {
            farmId: farm!.id,
            inputMethod: 'MIXED',
            content: "planting rice 2 acres " + uniqueName,
          },
        ),
      ).rejects.toThrow();

      expect(createdCropId).toBeDefined();

      const crop = await prisma.crop.findUnique({
        where: { id: createdCropId! },
      });
      expect(crop).toBeNull();

      const relationships =
        await prisma.resourceRelationship.findMany({
          where: {
            resourceType: 'crop',
            resourceId: createdCropId!,
          },
        });
      expect(relationships).toHaveLength(0);

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          resourceType: 'crop',
          resourceId: createdCropId!,
          action: 'CREATE',
        },
      });
      expect(auditEvents).toHaveLength(0);

      const farmRecords = await prisma.farmRecord.findMany({
        where: {
          farmId: farm!.id,
          data: {
            path: ['raw'],
            string_contains: uniqueName,
          },
        },
      });
      expect(farmRecords).toHaveLength(0);
    } finally {
      jest.restoreAllMocks();
    }
  });
});
