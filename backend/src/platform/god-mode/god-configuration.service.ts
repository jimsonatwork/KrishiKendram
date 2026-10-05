import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const DEFINITIONS = [
  ['system.truth', 'System Truth & Configuration', 'System Truth', 'Canonical platform root and configuration ownership.', 'object', 'LOW'],
  ['runtime.application', 'Runtime & Application', 'Runtime', 'Application runtime controls and restart requirements.', 'object', 'HIGH'],
  ['database.connections', 'Database & Connections', 'Database Connections', 'Database connection metadata and operational policy.', 'object', 'CRITICAL'],
  ['docker.infrastructure', 'Docker / Infrastructure', 'Infrastructure', 'Docker and infrastructure control metadata.', 'object', 'CRITICAL'],
  ['registry.modules', 'Modules & Registry', 'Modules', 'Canonical module registry and lifecycle metadata.', 'object', 'HIGH'],
  ['registry.resources', 'Resources & Capabilities', 'Resources', 'Resource definitions and capability ownership.', 'object', 'HIGH'],
  ['registry.validation', 'Fields & Validation', 'Validation', 'Field policy and validation ownership.', 'object', 'HIGH'],
  ['authorization.roles', 'Roles & Authorization', 'Authorization', 'Role, permission and delegation policy.', 'object', 'CRITICAL'],
  ['users.lifecycle', 'Users & Lifecycle', 'Users', 'User lifecycle and approval controls.', 'object', 'HIGH'],
  ['navigation.ui', 'Navigation Administration', 'Navigation', 'Navigation ownership and visibility policy.', 'object', 'MEDIUM'],
  ['themes.application-ui', 'Themes & Application UI', 'Themes', 'Theme and application UI policy.', 'object', 'LOW'],
  ['features.flags', 'Feature Flags', 'Feature Flags', 'Controlled feature rollout metadata.', 'object', 'HIGH'],
  ['security.policies', 'Security Policies', 'Security', 'Security policy ownership and enforcement metadata.', 'object', 'CRITICAL'],
  ['workflows.approvals', 'Approval Workflows', 'Workflows', 'Approval and change-governance policy.', 'object', 'HIGH'],
  ['credentials.secrets', 'Credentials & Secrets', 'Credentials', 'Credential artifact policy without exposing secret values.', 'object', 'CRITICAL'],
  ['audit.history', 'Audit & History', 'Audit', 'Audit and history retention/visibility policy.', 'object', 'HIGH'],
  ['recovery.snapshots', 'Snapshots & Recovery', 'Recovery', 'Snapshot, restore and rollback policy.', 'object', 'CRITICAL'],
  ['diagnostics.routes', 'Routes & API Diagnostics', 'Routes', 'Route health and API diagnostics policy.', 'object', 'HIGH'],
  ['diagnostics.system', 'System Diagnostics', 'Diagnostics', 'System health and diagnostic controls.', 'object', 'HIGH'],
  ['dependencies.graph', 'Dependency Graph', 'Dependencies', 'Dependency impact analysis policy.', 'object', 'HIGH'],
] as const;

@Injectable()
export class GodConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const [stableId, category, name, description, valueType, riskLevel] of DEFINITIONS) {
      await this.prisma.godConfiguration.upsert({
        where: { stableId },
        create: {
          stableId,
          category,
          name,
          description,
          currentValue: {},
          valueType,
          defaultValue: {},
          editable: false,
          godOnly: true,
          riskLevel,
          ownerSource: 'GOD_MODE_ARCHITECTURE',
        },
        update: {
          category,
          name,
          description,
          valueType,
          riskLevel,
          ownerSource: 'GOD_MODE_ARCHITECTURE',
        },
      });
    }
  }

  async list(category?: string) {
    return this.prisma.godConfiguration.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        dependencies: { select: { dependsOnId: true, relationship: true } },
        dependents: { select: { configurationId: true, relationship: true } },
      },
    });
  }

  async get(stableId: string) {
    const item = await this.prisma.godConfiguration.findUnique({
      where: { stableId },
      include: {
        dependencies: { include: { dependsOn: { select: { stableId: true, name: true, category: true } } } },
        dependents: { include: { configuration: { select: { stableId: true, name: true, category: true } } } },
      },
    });
    if (!item) throw new NotFoundException(`God configuration ${stableId} not found.`);
    return item;
  }

  async update(stableId: string, value: unknown, actorId: string) {
    const item = await this.prisma.godConfiguration.findUnique({ where: { stableId } });
    if (!item) throw new NotFoundException(`God configuration ${stableId} not found.`);
    if (!item.editable) throw new BadRequestException(`Configuration ${stableId} is metadata-only and cannot be changed yet.`);
    if (item.godOnly === false) throw new BadRequestException('God-only registry items cannot be delegated by this endpoint.');

    const currentValue = value as Prisma.InputJsonValue;
    if (item.snapshotBeforeChange) {
      await this.prisma.godConfigurationSnapshot.create({
        data: {
          stableId: item.stableId,
          configurationId: item.id,
          version: item.version,
          value: item.currentValue as Prisma.InputJsonValue,
          actorId,
          reason: 'PRE_CHANGE_SNAPSHOT',
        },
      });
    }
    const updated = await this.prisma.godConfiguration.update({
      where: { stableId },
      data: {
        currentValue,
        version: { increment: 1 },
        lastActorId: actorId,
        lastChangedAt: new Date(),
      },
    });

    await this.audit.create({
      actorId,
      action: 'GOD_CONFIGURATION_UPDATED',
      resourceType: 'GOD_CONFIGURATION',
      resourceId: updated.id,
      description: `God configuration ${stableId} updated.`,
      metadata: {
        stableId,
        version: updated.version,
        snapshotRequired: item.snapshotBeforeChange,
        healthCheckRequired: true,
      },
    });

    return updated;
  }

  async snapshots(stableId: string) {
    const item = await this.prisma.godConfiguration.findUnique({ where: { stableId }, select: { id: true } });
    if (!item) throw new NotFoundException(`God configuration ${stableId} not found.`);
    return this.prisma.godConfigurationSnapshot.findMany({ where: { configurationId: item.id }, orderBy: { version: 'desc' } });
  }

  async rollback(stableId: string, version: number, actorId: string) {
    const item = await this.prisma.godConfiguration.findUnique({ where: { stableId } });
    if (!item) throw new NotFoundException(`God configuration ${stableId} not found.`);
    if (!item.editable) throw new BadRequestException(`Configuration ${stableId} is metadata-only and cannot be rolled back.`);
    const snapshot = await this.prisma.godConfigurationSnapshot.findFirst({ where: { configurationId: item.id, version }, orderBy: { createdAt: 'desc' } });
    if (!snapshot) throw new NotFoundException(`Snapshot ${stableId}@${version} not found.`);

    await this.prisma.godConfigurationSnapshot.create({
      data: { stableId, configurationId: item.id, version: item.version, value: item.currentValue as Prisma.InputJsonValue, actorId, reason: `PRE_ROLLBACK_FROM_${item.version}` },
    });
    const updated = await this.prisma.godConfiguration.update({
      where: { stableId },
      data: { currentValue: snapshot.value as Prisma.InputJsonValue, version: { increment: 1 }, lastActorId: actorId, lastChangedAt: new Date() },
    });
    await this.audit.create({ actorId, action: 'GOD_CONFIGURATION_ROLLBACK', resourceType: 'GOD_CONFIGURATION', resourceId: item.id, description: `God configuration ${stableId} rolled back to version ${version}.`, metadata: { stableId, fromVersion: item.version, targetVersion: version, newVersion: updated.version } });
    return updated;
  }
}
