import { Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthorityTier, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../platform/audit/audit.service';
import { AiModelLinkRegistryService } from './ai-model-link-registry.service';

type ModelAdminRequest = { user?: { userId?: string; role?: UserRole }; ip?: string; headers?: Record<string, string | string[] | undefined> };

@Controller('admin/ai/models')
@UseGuards(JwtAuthGuard)
export class AiModelLinkController {
  constructor(private readonly models: AiModelLinkRegistryService, private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  async getModels(@Req() request: ModelAdminRequest) { await this.assertGodMode(request); return this.models.getStatus(); }

  @Post(':modelId/link')
  async link(@Req() request: ModelAdminRequest, @Param('modelId') modelId: string) {
    await this.assertGodMode(request);
    const result = this.models.link(modelId);
    await this.auditChange(request, 'AI_MODEL_LINKED', modelId, result);
    return result;
  }

  @Post(':modelId/unlink')
  async unlink(@Req() request: ModelAdminRequest, @Param('modelId') modelId: string) {
    await this.assertGodMode(request);
    const result = this.models.unlink(modelId);
    await this.auditChange(request, 'AI_MODEL_UNLINKED', modelId, result);
    return result;
  }

  @Post(':modelId/evaluate')
  async selectForEvaluation(@Req() request: ModelAdminRequest, @Param('modelId') modelId: string) {
    await this.assertGodMode(request);
    const result = await this.models.selectForEvaluation(modelId);
    await this.auditChange(request, 'AI_MODEL_SELECTED_FOR_EVALUATION', modelId, result);
    return result;
  }

  @Post(':modelId/activate')
  async activate(@Req() request: ModelAdminRequest, @Param('modelId') modelId: string) {
    await this.assertGodMode(request);
    const result = await this.models.activate(modelId);
    await this.auditChange(request, 'AI_MODEL_ACTIVATED', modelId, result);
    return result;
  }

  private async assertGodMode(request: ModelAdminRequest): Promise<void> {
    if (request.user?.role !== UserRole.SUPER_ADMIN || !request.user.userId) throw new UnauthorizedException('God Mode authority is required for AI model connection changes.');
    const user = await this.prisma.user.findUnique({ where: { id: request.user.userId }, select: { email: true, role: true, authorityTier: true } });
    if (user?.role !== UserRole.SUPER_ADMIN || user.authorityTier !== AuthorityTier.SYSTEM_GOD || user.email?.toLowerCase() !== 'jimson@jimson.jimson') {
      throw new UnauthorizedException('Only the canonical God Mode identity can change AI model connections.');
    }
  }

  private async auditChange(request: ModelAdminRequest, action: string, modelId: string, result: unknown): Promise<void> {
    await this.audit.create({ actorId: request.user?.userId ?? null, action, resourceType: 'AI_MODEL_LINK_REGISTRY', resourceId: modelId, description: action.replace(/_/g, ' ').toLowerCase(), metadata: result as any, ipAddress: request.ip ?? null, userAgent: String(request.headers?.['user-agent'] ?? '') || null });
  }
}
