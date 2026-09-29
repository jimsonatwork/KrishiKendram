import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from '../platform/audit/audit.service';
import { AuthorizationService } from '../platform/authorization/authorization.service';
import { AuthorizationAction } from '../platform/authorization/authorization.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const RESOURCE_TYPES = ['farmAsset', 'crop', 'livestock'] as const;

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly audit: AuditService) {}

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

  async create(userId: string, role: UserRole, dto: CreateListingDto) {
    const ownerId = await this.resourceOwner(dto.resourceType, dto.resourceId);
    if (!ownerId) throw new NotFoundException('Marketplace resource not found.');
    if (ownerId !== userId && role !== UserRole.SUPER_ADMIN) throw new BadRequestException('Only the current resource owner can create a listing.');
    const listing = await this.prisma.marketplaceListing.create({ data: { sellerId: ownerId, resourceType: dto.resourceType, resourceId: dto.resourceId, title: dto.title.trim(), description: dto.description?.trim(), quantity: dto.quantity, unit: dto.unit?.trim(), price: dto.price, currency: dto.currency?.trim().toUpperCase() || 'INR' } });
    await this.audit.create({ actorId: userId, action: 'CREATE', resourceType: 'marketplaceListing', resourceId: listing.id, description: 'Marketplace listing created' });
    return listing;
  }

  async findPublished() {
    return this.prisma.marketplaceListing.findMany({ where: { status: 'PUBLISHED', deletedAt: null, publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' } });
  }

  async findMine(userId: string, role: UserRole) {
    await this.authorization.assertCan({ user: { userId, role }, module: 'marketplace', resource: 'marketplaceListing', action: AuthorizationAction.READ, ownerId: userId });
    return this.prisma.marketplaceListing.findMany({ where: { sellerId: userId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async update(userId: string, role: UserRole, id: string, dto: UpdateListingDto) {
    await this.assertListing(userId, role, id, AuthorizationAction.UPDATE);
    return this.prisma.marketplaceListing.update({ where: { id }, data: { title: dto.title?.trim(), description: dto.description?.trim(), quantity: dto.quantity, unit: dto.unit?.trim(), price: dto.price, currency: dto.currency?.trim().toUpperCase() } });
  }

  async publish(userId: string, role: UserRole, id: string) {
    await this.assertListing(userId, role, id, AuthorizationAction.UPDATE);
    const listing = await this.prisma.marketplaceListing.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await this.audit.create({ actorId: userId, action: 'PUBLISH', resourceType: 'marketplaceListing', resourceId: id, description: 'Marketplace listing published' });
    return listing;
  }

  async archive(userId: string, role: UserRole, id: string) {
    await this.assertListing(userId, role, id, AuthorizationAction.DELETE);
    return this.prisma.marketplaceListing.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });
  }
}