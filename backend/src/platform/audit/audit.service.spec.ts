import { AuditService } from './audit.service';

describe('AuditService', () => {
  const findMany = jest.fn();
  const create = jest.fn();
  const prisma = {
    auditEvent: { findMany, create },
  } as any;

  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(prisma);
  });

  it('redacts sensitive metadata recursively for user activity', async () => {
    findMany.mockResolvedValue([
      {
        id: 'event-1',
        metadata: {
          password: 'db-password',
          nested: {
            token: 'secret-token',
            safe: 'visible',
            connectionString: 'postgres://secret',
          },
          items: [{ apiKey: 'secret-key', label: 'safe' }],
        },
      },
    ]);

    const events = await service.getUserActivity('user-1');

    expect(events[0].metadata).toEqual({
      password: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
        safe: 'visible',
        connectionString: '[REDACTED]',
      },
      items: [{ apiKey: '[REDACTED]', label: 'safe' }],
    });
  });

  it('redacts sensitive metadata for recent activity too', async () => {
    findMany.mockResolvedValue([
      { id: 'event-2', metadata: { databaseUrl: 'postgres://secret' } },
    ]);

    const events = await service.getRecentActivity();

    expect(events[0].metadata).toEqual({ databaseUrl: '[REDACTED]' });
  });
});
