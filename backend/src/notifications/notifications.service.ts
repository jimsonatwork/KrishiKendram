import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../platform/registry/registry.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
export type NotificationEventInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  severity?: NotificationSeverity;
  source: string;
  dedupeKey: string;
  expiresAt?: Date | null;
};

const NOTIFICATION_RETENTION_DAYS = 180;
const SEVERITIES: NotificationSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'];

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly registry: RegistryService) {}

  private static safeHref(href?: string | null): string | null {
    if (!href || !href.startsWith('/app/') || href.startsWith('//') || href.includes('\\')) return null;
    return href;
  }

  static async createInTransaction(tx: Prisma.TransactionClient, input: NotificationEventInput) {
    const severity = input.severity || (input.type === 'LOW_STOCK' ? 'WARNING' : 'INFO');
    if (!SEVERITIES.includes(severity)) throw new Error('Unsupported notification severity: ' + severity);
    const data = {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: this.safeHref(input.href),
      severity,
      source: input.source.trim().toLowerCase().slice(0, 40),
      dedupeKey: input.dedupeKey.trim().slice(0, 200),
      expiresAt: input.expiresAt || new Date(Date.now() + NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    };
    await tx.notification.createMany({ data, skipDuplicates: true });
    return tx.notification.findFirst({ where: { userId: input.userId, dedupeKey: data.dedupeKey } });
  }

  private validateFilter(field: string, value: unknown): unknown {
    const result = this.registry.validateResourceField('notification', field, value);
    if (!result.valid) throw new BadRequestException({ message: 'Invalid notification filter: ' + field + '.', errors: result.errors });
    return result.value;
  }

  private activeExpiryFilter(now: Date) {
    return { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  }

  async list(userId: string, query: NotificationQueryDto = {}) {
    const type = query.type?.trim() || undefined;
    const severity = query.severity?.trim().toUpperCase() || undefined;
    const unreadOnly = query.unreadOnly === 'true';
    const limit = query.limit === undefined ? 100 : Number(query.limit);
    if (type) this.validateFilter('type', type);
    if (severity) this.validateFilter('severity', severity);
    if (query.unreadOnly !== undefined) this.validateFilter('unreadOnly', unreadOnly);
    this.validateFilter('limit', limit);
    const now = new Date();
    const where: any = { userId, ...this.activeExpiryFilter(now) };
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (unreadOnly) where.readAt = null;
    const rows = await this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map(item => ({ ...item, href: NotificationsService.safeHref(item.href) }));
  }

  async unreadCount(userId: string) {
    const where = { userId, readAt: null, ...this.activeExpiryFilter(new Date()) };
    const unreadCount = await this.prisma.notification.count({ where });
    return { unreadCount };
  }

  async markRead(userId: string, id: string) {
    const now = new Date();
    const active = this.activeExpiryFilter(now);
    await this.prisma.notification.updateMany({ where: { id, userId, readAt: null, ...active }, data: { readAt: now } });
    const item = await this.prisma.notification.findFirst({ where: { id, userId, ...active } });
    if (!item) throw new NotFoundException('Notification not found.');
    return { ...item, href: NotificationsService.safeHref(item.href) };
  }

  async markAllRead(userId: string) {
    const markedRead = await this.prisma.notification.updateMany({ where: { userId, readAt: null, ...this.activeExpiryFilter(new Date()) }, data: { readAt: new Date() } });
    return { markedRead: markedRead.count };
  }
}
