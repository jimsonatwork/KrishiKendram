import { ResourceLineageResolverService } from './lineage-resolver.service';
import { ResourceLineageType } from './lineage.types';

describe('ResourceLineageResolverService', () => {
  const findMany = jest.fn();
  const prisma = { resourceLineage: { findMany } } as any;
  let service: ResourceLineageResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResourceLineageResolverService(prisma);
  });

  it('resolves inbound lineage by default', async () => {
    findMany.mockResolvedValue([
      {
        sourceResourceType: 'farm',
        sourceResourceId: 'farm-001',
        targetResourceType: 'farm',
        targetResourceId: 'farm-002',
        lineageType: ResourceLineageType.SPLIT_FROM,
        movementId: 'movement-001',
        quantity: 2,
        unit: 'acre',
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        reason: 'split',
        metadata: null,
        createdBy: 'admin-001',
        updatedBy: 'admin-001',
      },
    ]);

    const result = await service.resolve({
      resourceType: 'farm',
      resourceId: 'farm-002',
    });

    expect(result.lineages).toHaveLength(1);
    expect(result.lineages[0].lineageType).toBe(ResourceLineageType.SPLIT_FROM);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            targetResourceType: 'farm',
            targetResourceId: 'farm-002',
          },
          {
            sourceResourceType: 'farm',
            sourceResourceId: 'farm-002',
          },
        ],
      },
      orderBy: [{ effectiveAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('resolves outbound lineage with an effective-date window', async () => {
    findMany.mockResolvedValue([]);
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-09-26T00:00:00.000Z');

    await service.resolve({ resourceType: 'farm', resourceId: 'farm-001', direction: 'OUTBOUND', from, to });

    expect(findMany).toHaveBeenCalledWith({ where: { sourceResourceType: 'farm', sourceResourceId: 'farm-001', effectiveAt: { gte: from, lte: to } }, orderBy: [{ effectiveAt: 'asc' }, { id: 'asc' }]});
  });
});
