import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../platform/audit/audit.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from '../platform/registry/registry.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const RESOURCE_TYPES = ['farmAsset', 'crop', 'livestock'] as const;
type MarketplaceValidatedFields = {
  title?: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  price?: number | null;
  currency?: string;
};

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
    private readonly registry: RegistryService,
  ) {}

  private async resourceOwner(resourceType: string, resourceId: string) {
    if (!RESOURCE_TYPES.includes(resourceType as typeof RESOURCE_TYPES[number])) throw new BadRequestException('Unsupported marketplace resource.');
    const relationship = await this.prisma.resourceRelationship.findFirst({ where: { resourceType, resourceId, relationshipType: 'OWNER', endedAt: null }, select: { userId: true } });
    if (relationship) return relationship.userId;
    if (resourceType === 'farmAsset') {
      const r = await this.prisma.farmAsset.findUnique({ where: { id: resourceId }, select: { farm: { select: { ownerId: true } } } });
      return r?.farm.ownerId;
    }
    if (resourceType === 'crop') {
      const r = await this.prisma.crop.findUnique({ where: { id: resourceId }, select: { farm: { select: { ownerId: true } } } });
      return r?.farm.ownerId;
    }
    const r = await this.prisma.livestock.findUnique({ where: { id: resourceId }, select: { farm: { select: { ownerId: true } } } });
    return r?.farm.ownerId;
  }

  private async assertListing(userId: string, role: UserRole, id: string, action: AuthorizationAction) {
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id, deletedAt: null }, select: { id: true, sellerId: true } });
    if (!listing) throw new NotFoundException('Marketplace listing not found.');
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceListing', action, resourceId: id, ownerId: listing.sellerId });
    return listing;
  }

  private validateFields(input: Record<string, unknown>): MarketplaceValidatedFields {
    const data: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(input)) {
      if (value === undefined) continue;
      const validation = this.registry.validateResourceField('marketplaceListing', field, value);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Invalid marketplace listing ' + field + '.',
          errors: validation.errors,
        });
      }
      data[field] = validation.value;
    }
    return data;
  }

  async create(
    userId: string,
    role: UserRole,
    dto: CreateListingDto,
    transaction?: Prisma.TransactionClient,
  ) {
    const validated = this.validateFields({
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      title: dto.title,
      description: dto.description,
      quantity: dto.quantity,
      unit: dto.unit,
      price: dto.price,
      currency: dto.currency,
    });
    const ownerId = await this.resourceOwner(dto.resourceType, dto.resourceId);
    if (!ownerId) throw new NotFoundException('Marketplace resource not found.');
    if (dto.resourceType === 'farmAsset') {
      const asset = await this.prisma.farmAsset.findFirst({ where: { id: dto.resourceId }, select: { id: true } });
      if (!asset) throw new NotFoundException('Marketplace resource not found.');
    } else if (dto.resourceType === 'crop') {
      const crop = await this.prisma.crop.findFirst({ where: { id: dto.resourceId }, select: { id: true } });
      if (!crop) throw new NotFoundException('Marketplace resource not found.');
    } else {
      const livestock = await this.prisma.livestock.findFirst({ where: { id: dto.resourceId }, select: { id: true } });
      if (!livestock) throw new NotFoundException('Marketplace resource not found.');
    }
    await this.authorization.assertCan({
      user: { userId, role },
      module: 'marketplace',
      resource: 'marketplaceListing',
      action: AuthorizationAction.CREATE,
      ownerId,
    });
    const createInTransaction = async (tx: Prisma.TransactionClient) => {
      const listing = await tx.marketplaceListing.create({ data: { sellerId: ownerId, resourceType: dto.resourceType, resourceId: dto.resourceId, title: validated.title!, description: validated.description, quantity: validated.quantity, unit: validated.unit, price: validated.price, currency: validated.currency || 'INR' } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'CREATE', resourceType: 'marketplaceListing', resourceId: listing.id, description: 'Marketplace listing created' });
      return listing;
    };
    return transaction ? createInTransaction(transaction) : this.prisma.$transaction(createInTransaction);
  }

  async findPublished() {
    return this.prisma.marketplaceListing.findMany({ where: { status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' } });
  }

  async findMine(userId: string, role: UserRole) {
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceListing', action: AuthorizationAction.READ, ownerId: userId });
    return this.prisma.marketplaceListing.findMany({ where: { sellerId: userId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async update(userId: string, role: UserRole, id: string, dto: UpdateListingDto, transaction?: Prisma.TransactionClient) {
    await this.assertListing(userId, role, id, AuthorizationAction.UPDATE);
    const validated = this.validateFields({
      title: dto.title,
      description: dto.description,
      quantity: dto.quantity,
      unit: dto.unit,
      price: dto.price,
      currency: dto.currency,
    });
    const performUpdate = async (tx: Prisma.TransactionClient) => {
      const listing = await tx.marketplaceListing.update({ where: { id }, data: { title: validated.title!, description: validated.description, quantity: validated.quantity, unit: validated.unit, price: validated.price, currency: validated.currency } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'UPDATE', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing updated' });
      return listing;
    };
    return transaction ? performUpdate(transaction) : this.prisma.$transaction(performUpdate);
  }

  async publish(userId: string, role: UserRole, id: string) {
    await this.assertListing(userId, role, id, AuthorizationAction.UPDATE);
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'PUBLISH', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing published' });
      return listing;
    });
  }

  async archive(userId: string, role: UserRole, id: string) {
    await this.assertListing(userId, role, id, AuthorizationAction.DELETE);
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });
      await this.audit.createInTransaction(tx, { actorId: userId, action: 'DELETE', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing archived' });
      return listing;
    });
  }
}
