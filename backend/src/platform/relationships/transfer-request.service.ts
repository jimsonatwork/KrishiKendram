import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ResourceRelationshipService } from './relationship.service';
import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';

@Injectable()
export class ResourceTransferRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relationships: ResourceRelationshipService,
  ) {}

  async create(dto: CreateTransferRequestDto, actorId: string, role: UserRole) {
    const source = await this.prisma.resourceRelationship.findFirst({
      where: { resourceType: dto.resourceType, resourceId: dto.resourceId, relationshipType: 'OWNER', endedAt: null },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });
    if (!source) throw new NotFoundException('Active resource owner not found.');
    if (source.userId !== actorId && !this.isPrivileged(role)) throw new ForbiddenException('Only the active owner or administrator can request a transfer.');
    if (dto.destinationUserId === source.userId) throw new BadRequestException('Destination user already owns this resource.');
    const destination = await this.prisma.user.findUnique({ where: { id: dto.destinationUserId }, select: { id: true, status: true } });
    if (!destination || destination.status !== UserStatus.ACTIVE) throw new BadRequestException('Destination user is not active.');
    if (dto.quantity !== undefined) throw new BadRequestException('Partial transfer requests require the partial-transfer lifecycle and are not yet executable.');
    const requestNumber = await this.nextRequestNumber();
    return this.prisma.resourceTransferRequest.create({
      data: {
        requestNumber, resourceType: dto.resourceType, resourceId: dto.resourceId,
        sourceUserId: source.userId, destinationUserId: dto.destinationUserId,
        unit: dto.unit, status: 'PENDING',
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        reason: dto.reason, transactionId: dto.transactionId,
        createdBy: actorId, updatedBy: actorId,
      },
    });
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
  async accept(id: string, actorId: string) { return this.complete(id, actorId, false); }

  async approve(id: string, actorId: string, role: UserRole, approvalReason?: string) {
    if (!this.isPrivileged(role)) throw new ForbiddenException('Administrator approval is required for this operation.');
    return this.complete(id, actorId, true, approvalReason);
  }

  async reject(id: string, actorId: string) {
    const request = await this.getPending(id);
    if (request.destinationUserId !== actorId) throw new ForbiddenException('Only the destination user can reject this request.');
    return this.prisma.resourceTransferRequest.update({ where: { id }, data: { status: 'REJECTED', rejectedAt: new Date(), rejectedBy: actorId, updatedBy: actorId } });
  }

  async cancel(id: string, actorId: string) {
    const request = await this.getPending(id);
    if (request.sourceUserId !== actorId) throw new ForbiddenException('Only the source user can cancel this request.');
    return this.prisma.resourceTransferRequest.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), updatedBy: actorId } });
  }

  private async complete(id: string, actorId: string, administrative: boolean, approvalReason?: string) {
    const request = await this.getPending(id);
    if (!administrative && request.destinationUserId !== actorId) throw new ForbiddenException('Only the destination user can accept this request.');
    const effectiveAt = request.effectiveAt ?? new Date();
    if (request.expiresAt && request.expiresAt < new Date()) throw new BadRequestException('Transfer request has expired.');

    return this.prisma.$transaction(async (tx) => {
      const currentOwner = await tx.resourceRelationship.findFirst({
        where: { resourceType: request.resourceType, resourceId: request.resourceId, userId: request.sourceUserId, relationshipType: 'OWNER', endedAt: null },
        orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      });
      if (!currentOwner) throw new BadRequestException('Source ownership is no longer active.');
      await this.relationships.transferOwnerRelationship(
        tx, request.resourceType, request.resourceId,
        request.sourceUserId, request.destinationUserId,
        effectiveAt, request.reason ?? 'Transfer request accepted',
        request.transactionId ?? undefined,
      );

      if (request.resourceType === 'farm') {
        await tx.farm.update({ where: { id: request.resourceId }, data: { ownerId: request.destinationUserId } });
      }

      return tx.resourceTransferRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          acceptedAt: administrative ? request.acceptedAt : new Date(),
          acceptedBy: administrative ? null : actorId,
          approvedBy: administrative ? actorId : request.approvedBy,
          approvalReason: administrative ? approvalReason : request.approvalReason,
          completedAt: new Date(), effectiveAt, updatedBy: actorId,
        },
      });
    });
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
