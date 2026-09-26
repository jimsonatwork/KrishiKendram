import { ResourceEvidenceType } from './evidence.types';
import { ResourceEvidenceResolverService } from './evidence-resolver.service';

describe('ResourceEvidenceResolverService', () => {
  const findMany = jest.fn();

  const prisma = {
    resourceEvidence: {
      findMany,
    },
  } as any;

  beforeEach(() => {
    findMany.mockReset();
  });

  it('resolves evidence linked to a resource through relationships or movements', async () => {
    findMany.mockResolvedValue([
      {
        id: 'evidence-1',
        evidenceType: ResourceEvidenceType.DOCUMENT,
        referenceType: 'DOCUMENT_NUMBER',
        referenceValue: 'SALE-001',
        documentNumber: 'SALE-001',
        issuer: 'Registrar',
        issuedAt: new Date('2026-09-26T00:00:00Z'),
        expiresAt: null,
        integrityHash: 'sha256:test',
        metadata: { source: 'registry' },
        createdBy: 'admin',
        updatedBy: 'admin',
      },
    ]);

    const service = new ResourceEvidenceResolverService(prisma);
    const result = await service.resolve({
      resourceType: 'farmAsset',
      resourceId: 'asset-1',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              relationships: {
                some: { resourceType: 'farmAsset', resourceId: 'asset-1' },
              },
            },
            {
              movements: {
                some: { resourceType: 'farmAsset', resourceId: 'asset-1' },
              },
            },
          ],
        }),
      }),
    );
    expect(result.evidence[0]).toMatchObject({
      id: 'evidence-1',
      referenceValue: 'SALE-001',
      integrityHash: 'sha256:test',
    });
  });

  it('filters by movement and evidence type without returning document content', async () => {
    findMany.mockResolvedValue([]);

    const service = new ResourceEvidenceResolverService(prisma);
    const result = await service.resolve({
      movementId: 'movement-1',
      evidenceType: ResourceEvidenceType.TRANSACTION,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          evidenceType: ResourceEvidenceType.TRANSACTION,
          movements: { some: { id: 'movement-1' } },
        },
      }),
    );
    expect(result.evidence).toEqual([]);
  });
});
