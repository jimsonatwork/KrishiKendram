import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ResourceRelationshipService } from './relationship.service';
import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';

@Injectable()
export class ResourceTransferRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relationships: ResourceRelationshipService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTransferRequestDto, actorId: string, role: UserRole) {
    const source = await this.prisma.resourceRelationship.findFirst({
      where: { resourceType: dto.resourceType, resourceId: dto.resourceId, relationshipType: 'OWNER', endedAt: null },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });
    if (!source) throw new NotFoundException('Active resource owner not found.');
    if (source.userId !== actorId && !this.isPrivileged(role)) throw new ForbiddenException('Only the active owner or administrator can request a transfer.');
    if (dto.destinationUserId === source.userId) throw new BadRequestException('Destination user already owns this resource.');

    const destination = await this.prisma.user.findUnique({
      where: { id: dto.destinationUserId }, select: { id: true, status: true },
    });
    if (!destination || destination.status !== UserStatus.ACTIVE) throw new BadRequestException('Destination user is not active.');

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (effectiveAt && expiresAt && expiresAt <= effectiveAt) {
      throw new BadRequestException('Transfer expiry must be after the effective time.');
    }
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('Transfer expiry must be in the future.');
    }

    if (dto.quantity !== undefined) {
      if (dto.resourceType !== 'farmAsset') throw new BadRequestException('Partial transfer is currently supported only for farm assets.');
      if (dto.quantity <= 0) throw new BadRequestException('Partial transfer quantity must be greater than zero.');
    }

    const requestNumber = await this.nextRequestNumber();
    const created = await this.prisma.resourceTransferRequest.create({
      data: {
        requestNumber, resourceType: dto.resourceType, resourceId: dto.resourceId,
        sourceUserId: source.userId, destinationUserId: dto.destinationUserId,
        quantity: dto.quantity, unit: dto.unit, status: 'PENDING',
        effectiveAt,
        expiresAt,
        reason: dto.reason, transactionId: dto.transactionId,
        createdBy: actorId, updatedBy: actorId,
      },
    });
    await this.audit.create({
      actorId, action: 'RESOURCE_TRANSFER_REQUESTED', resourceType: dto.resourceType, resourceId: dto.resourceId,
      description: 'Transfer request created.',
      metadata: { requestId: created.id, destinationUserId: dto.destinationUserId, quantity: dto.quantity ?? null, unit: dto.unit ?? null },
    });
    return created;
  }

  async findActiveMember(memberId: string) {
    const normalized = memberId.trim().toUpperCase();
    if (!normalized) throw new BadRequestException('Member ID is required.');

    const member = await this.prisma.user.findFirst({
      where: { memberId: normalized, status: UserStatus.ACTIVE },
      select: { id: true, memberId: true, name: true },
    });

    if (!member) throw new NotFoundException('Active member not found.');
    return member;
  }

  listIncoming(userId: string) {
    return this.prisma.resourceTransferRequest.findMany({
      where: { destinationUserId: userId }, orderBy: { requestedAt: 'desc' },
      include: { sourceUser: { select: { id: true, memberId: true, name: true } }, destinationUser: { select: { id: true, memberId: true, name: true } } },
    });
  }

  listOutgoing(userId: string) {
    return this.prisma.resourceTransferRequest.findMany({
      where: { sourceUserId: userId }, orderBy: { requestedAt: 'desc' },
      include: { sourceUser: { select: { id: true, memberId: true, name: true } }, destinationUser: { select: { id: true, memberId: true, name: true } } },
    });
  }

  listIncomingPending(userId: string) {
    return this.prisma.resourceTransferRequest.findMany({
      where: { destinationUserId: userId, status: 'PENDING' },
      orderBy: { requestedAt: 'asc' },
      include: {
        sourceUser: { select: { id: true, memberId: true, name: true } },
        destinationUser: { select: { id: true, memberId: true, name: true } },
      },
    });
  }

  async getPendingCount(userId: string) {
    const count = await this.prisma.resourceTransferRequest.count({
      where: { destinationUserId: userId, status: 'PENDING' },
    });
    return { count };
  }

  async accept(id: string, actorId: string) { return this.complete(id, actorId, false); }

  async approve(id: string, actorId: string, role: UserRole, approvalReason?: string) {
    if (!this.isPrivileged(role)) throw new ForbiddenException('Administrator approval is required for this operation.');
    return this.complete(id, actorId, true, approvalReason);
  }

  async reject(id: string, actorId: string) {
    const request = await this.getPending(id);
    if (request.destinationUserId !== actorId) throw new ForbiddenException('Only the destination user can reject this request.');
    const updated = await this.prisma.resourceTransferRequest.update({
      where: { id }, data: { status: 'REJECTED', rejectedAt: new Date(), rejectedBy: actorId, updatedBy: actorId },
    });
    await this.audit.create({ actorId, action: 'RESOURCE_TRANSFER_REJECTED', resourceType: request.resourceType, resourceId: request.resourceId, description: 'Transfer request rejected.', metadata: { requestId: id } });
    return updated;
  }

  async cancel(id: string, actorId: string) {
    const request = await this.getPending(id);
    if (request.sourceUserId !== actorId) throw new ForbiddenException('Only the source user can cancel this request.');
    const updated = await this.prisma.resourceTransferRequest.update({
      where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), updatedBy: actorId },
    });
    await this.audit.create({ actorId, action: 'RESOURCE_TRANSFER_CANCELLED', resourceType: request.resourceType, resourceId: request.resourceId, description: 'Transfer request cancelled.', metadata: { requestId: id } });
    return updated;
  }

  private async complete(id: string, actorId: string, administrative: boolean, approvalReason?: string) {
    const request = await this.getPending(id);
    if (!administrative && request.destinationUserId !== actorId) {
      throw new ForbiddenException('Only the destination user can accept this request.');
    }
    const effectiveAt = request.effectiveAt ?? new Date();
    if (request.expiresAt && request.expiresAt < new Date()) throw new BadRequestException('Transfer request has expired.');

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.resourceTransferRequest.updateMany({
        where: { id, status: { in: ['PENDING', 'APPROVED'] } },
        data: {
          status: 'ACCEPTED', acceptedAt: new Date(),
          acceptedBy: administrative ? undefined : actorId,
          approvedBy: administrative ? actorId : undefined,
          approvalReason: administrative ? approvalReason : undefined,
          updatedBy: actorId,
        },
      });
      if (claimed.count !== 1) throw new BadRequestException('Transfer request is no longer pending.');

      const currentOwner = await tx.resourceRelationship.findFirst({
        where: { resourceType: request.resourceType, resourceId: request.resourceId, userId: request.sourceUserId, relationshipType: 'OWNER', endedAt: null },
        orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      });
      if (!currentOwner) throw new BadRequestException('Source ownership is no longer active.');

      if (request.quantity !== null && request.quantity !== undefined) {
        await this.completePartialFarmAssetTransfer(tx, request, actorId, effectiveAt, currentOwner.id);
      } else {
        await this.relationships.transferOwnerRelationship(
          tx, request.resourceType, request.resourceId, request.sourceUserId, request.destinationUserId,
          effectiveAt, request.reason ?? 'Transfer request accepted', request.transactionId ?? undefined,
        );
        if (request.resourceType === 'farm') {
          await tx.farm.update({ where: { id: request.resourceId }, data: { ownerId: request.destinationUserId } });
        }
      }

      const completed = await tx.resourceTransferRequest.update({
        where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), effectiveAt, updatedBy: actorId },
      });
      await this.audit.createInTransaction(tx, {
        actorId, action: 'RESOURCE_TRANSFER_COMPLETED', resourceType: request.resourceType, resourceId: request.resourceId,
        description: 'Transfer request completed.',
        metadata: { requestId: id, sourceUserId: request.sourceUserId, destinationUserId: request.destinationUserId, quantity: request.quantity ?? null, unit: request.unit ?? null, partial: request.quantity !== null && request.quantity !== undefined },
      });
      return completed;
    });
  }

  private async completePartialFarmAssetTransfer(tx: any, request: any, actorId: string, effectiveAt: Date, sourceRelationshipId: string) {
    if (request.resourceType !== 'farmAsset') throw new BadRequestException('Partial transfer is currently supported only for farm assets.');

    const asset = await tx.farmAsset.findUnique({
      where: { id: request.resourceId },
      select: { id: true, farmId: true, type: true, name: true, quantity: true, unit: true, metadata: true },
    });
    if (!asset) throw new NotFoundException('Farm asset not found.');
    if (asset.quantity === null || asset.quantity === undefined) throw new BadRequestException('Only quantified farm assets can be partially transferred.');
    if (request.quantity <= 0 || request.quantity >= asset.quantity) {
      throw new BadRequestException('Partial transfer quantity must be greater than zero and less than the source quantity.');
    }
    if (request.unit && asset.unit && request.unit !== asset.unit) throw new BadRequestException('Transfer unit does not match the asset unit.');
    if (request.unit && !asset.unit) throw new BadRequestException('The source asset has no unit.');

    const remainingQuantity = asset.quantity - request.quantity;
    const target = await tx.farmAsset.create({
      data: { farmId: asset.farmId, type: asset.type, name: asset.name, quantity: request.quantity, unit: asset.unit, metadata: asset.metadata },
    });

    await this.relationships.createOwnerRelationship(tx, 'farmAsset', target.id, request.sourceUserId, effectiveAt);
    await tx.farmAsset.update({ where: { id: asset.id }, data: { quantity: remainingQuantity } });

    const previousMovement = await tx.resourceMovement.findFirst({
      where: { resourceType: 'farmAsset', resourceId: asset.id },
      orderBy: [{ effectiveAt: 'desc' }, { recordedAt: 'desc' }, { id: 'desc' }],
    });

    const splitMovement = await tx.resourceMovement.create({
      data: {
        resourceType: 'farmAsset', resourceId: target.id, movementType: 'SPLIT',
        sourceUserId: request.sourceUserId, sourceResourceType: 'farmAsset', sourceResourceId: asset.id,
        destinationUserId: request.sourceUserId, destinationResourceType: 'farmAsset', destinationResourceId: target.id,
        sourceRelationshipId: sourceRelationshipId, previousMovementId: previousMovement?.id,
        quantity: request.quantity, unit: asset.unit, effectiveAt,
        reason: request.reason ?? 'Partial transfer split', transactionId: request.transactionId,
        createdBy: actorId, updatedBy: actorId,
      },
    });

    await tx.resourceLineage.create({
      data: {
        sourceResourceType: 'farmAsset', sourceResourceId: asset.id, targetResourceType: 'farmAsset', targetResourceId: target.id,
        lineageType: 'SPLIT_FROM', movementId: splitMovement.id, quantity: request.quantity, unit: asset.unit,
        effectiveAt, reason: request.reason ?? 'Partial transfer split',
        metadata: { transferRequestId: request.id, sourceRemainingQuantity: remainingQuantity },
        createdBy: actorId, updatedBy: actorId,
      },
    });

    await this.relationships.transferOwnerRelationship(
      tx, 'farmAsset', target.id, request.sourceUserId, request.destinationUserId,
      effectiveAt, request.reason ?? 'Partial transfer accepted', request.transactionId ?? undefined,
    );
    return target;
  }

  private async getPending(id: string) {
    const request = await this.prisma.resourceTransferRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Transfer request not found.');
    if (request.status !== 'PENDING' && request.status !== 'APPROVED') throw new BadRequestException('Transfer request is no longer pending.');
    return request;
  }

  private isPrivileged(role: UserRole) {
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN || role === UserRole.STATE_ADMIN || role === UserRole.DISTRICT_ADMIN;
  }

  private async nextRequestNumber() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const suffix = Math.floor(100000 + Math.random() * 900000);
      const requestNumber = 'TR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + suffix;
      const exists = await this.prisma.resourceTransferRequest.findUnique({ where: { requestNumber }, select: { id: true } });
      if (!exists) return requestNumber;
    }
    throw new BadRequestException('Unable to allocate a transfer request number.');
  }
}
