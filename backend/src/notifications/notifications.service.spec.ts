import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma: any = { notification: { findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() } };
  const registry: any = { validateResourceField: jest.fn((_resource: string, _field: string, value: unknown) => ({ valid: true, value, errors: [] })) };
  let service: NotificationsService;
  beforeEach(() => {
    jest.clearAllMocks();
    registry.validateResourceField.mockImplementation((_resource: string, _field: string, value: unknown) => ({ valid: true, value, errors: [] }));
    service = new NotificationsService(prisma, registry);
  });

  it('lists only active notifications belonging to the authenticated user', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'n-1', userId: 'u-1', href: '/app/marketplace' }]);
    await service.list('u-1');
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  });

  it('validates filters through the Registry and sanitizes unsafe deep links', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'n-2', userId: 'u-1', href: 'https://evil.example/redirect', severity: 'WARNING' }]);
    const result = await service.list('u-1', { type: 'LOW_STOCK', severity: 'WARNING', unreadOnly: 'true', limit: '25' });
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }], type: 'LOW_STOCK', severity: 'WARNING', readAt: null },
      orderBy: { createdAt: 'desc' }, take: 25,
    });
    expect(result[0].href).toBeNull();
    expect(registry.validateResourceField).toHaveBeenCalledWith('notification', 'severity', 'WARNING');
    expect(registry.validateResourceField).toHaveBeenCalledWith('notification', 'unreadOnly', true);
    expect(registry.validateResourceField).toHaveBeenCalledWith('notification', 'limit', 25);
  });

  it('returns the unread count scoped to the authenticated user and active retention window', async () => {
    prisma.notification.count.mockResolvedValue(3);
    await expect(service.unreadCount('u-1')).resolves.toEqual({ unreadCount: 3 });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] } });
  });

  it('does not disclose notifications belonging to another user or expired notifications', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('u-1', 'n-other')).rejects.toThrow(NotFoundException);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { id: 'n-other', userId: 'u-1', readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] }, data: { readAt: expect.any(Date) } });
  });

  it('marks only active unread notifications for the current user', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    await expect(service.markAllRead('u-1')).resolves.toEqual({ markedRead: 4 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] }, data: { readAt: expect.any(Date) } });
  });

  it('deduplicates event writes transactionally, assigns retention metadata and blocks external hrefs', async () => {
    const tx: any = { notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ id: 'n-3' }) } };
    await expect(NotificationsService.createInTransaction(tx, { userId: 'u-1', type: 'MARKETPLACE_ORDER', title: 'Order update', message: 'Order created', href: 'https://evil.example', source: 'marketplace', dedupeKey: 'order-created:order-1' })).resolves.toEqual({ id: 'n-3' });
    expect(tx.notification.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'u-1', severity: 'INFO', source: 'marketplace', dedupeKey: 'order-created:order-1', href: null, expiresAt: expect.any(Date) }), skipDuplicates: true });
    expect(tx.notification.findFirst).toHaveBeenCalledWith({ where: { userId: 'u-1', dedupeKey: 'order-created:order-1' } });
  });

  it('rejects Registry-invalid filters', async () => {
    registry.validateResourceField.mockReturnValue({ valid: false, value: undefined, errors: ['invalid'] });
    await expect(service.list('u-1', { severity: 'WARNING' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
