import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma: any = { notification: { findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() } };
  let service: NotificationsService;
  beforeEach(() => { jest.clearAllMocks(); service = new NotificationsService(prisma); });
  it('lists only notifications belonging to the authenticated user', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'n-1', userId: 'u-1' }]);
    await service.list('u-1');
    expect(prisma.notification.findMany).toHaveBeenCalledWith({ where: { userId: 'u-1' }, orderBy: { createdAt: 'desc' }, take: 100 });
  });
  it('returns the unread count scoped to the authenticated user', async () => {
    prisma.notification.count.mockResolvedValue(3);
    await expect(service.unreadCount('u-1')).resolves.toEqual({ unreadCount: 3 });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null } });
  });
  it('does not disclose notifications belonging to another user', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('u-1', 'n-other')).rejects.toThrow(NotFoundException);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { id: 'n-other', userId: 'u-1', readAt: null }, data: { readAt: expect.any(Date) } });
  });
  it('marks all unread notifications for the current user', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    await expect(service.markAllRead('u-1')).resolves.toEqual({ markedRead: 4 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null }, data: { readAt: expect.any(Date) } });
  });
});
