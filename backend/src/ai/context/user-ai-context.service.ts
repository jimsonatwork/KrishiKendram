import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../platform/authorization/authorization.service';
import type { AuthorizationContext, AuthorizationRequest } from '../../platform/authorization/authorization.service';
import { AuthorizationAction } from '../../platform/authorization/authorization.types';
import type { FieldPolicyOperation } from '../../platform/authorization/field-policy.service';
import { AiRegistryService } from '../registry/ai-registry.service';

export interface AiContextValues { [key: string]: unknown; }

export interface UserAiContextRequest {
  actor: AuthorizationContext;
  moduleId: string;
  capability: string;
  references?: string[];
  fields: string[];
  authorization: Omit<AuthorizationRequest, 'user' | 'module'> & { action?: AuthorizationAction };
  values: AiContextValues;
}

export interface UserAiContextEnvelope {
  policy: { registryId: string; authorizationBeforeContext: true; databaseWriteAllowed: false; userConfirmationRequired: true };
  actor: { userId: string };
  module: { moduleId: string; capability: string };
  references: Record<string, unknown>;
  fields: Record<string, unknown>;
}

@Injectable()
export class UserAiContextService {
  constructor(private readonly authorizationService: AuthorizationService, private readonly registry: AiRegistryService) {}

  async buildContext(request: UserAiContextRequest): Promise<UserAiContextEnvelope> {
    if (!request.actor?.userId) throw new BadRequestException('AI context requires an authenticated actor.');
    if (!request.moduleId) throw new BadRequestException('AI context requires a moduleId.');
    if (!request.capability) throw new BadRequestException('AI context requires an AI capability.');
    if (!Array.isArray(request.fields) || request.fields.length === 0) throw new BadRequestException('AI context requires explicit fields.');

    this.registry.assertModuleRegistered(request.moduleId);
    this.registry.assertCapabilityAllowed(request.moduleId, request.capability);
    this.registry.assertContextAllowed({ moduleId: request.moduleId, capability: request.capability, references: request.references, fields: request.fields });

    const authorizationRequest: AuthorizationRequest = {
      ...request.authorization,
      user: request.actor,
      module: request.moduleId,
      action: request.authorization.action ?? AuthorizationAction.READ,
    };
    const decision = await this.authorizationService.authorizeFields(authorizationRequest, request.fields, 'READ');
    if (!decision.allowed) throw new BadRequestException(`AI context authorization denied for ${request.moduleId}/${authorizationRequest.resource}.`);

    this.registry.assertCanonicalWriteForbidden();
    const module = this.registry.getModule(request.moduleId);
    const projectedFields: Record<string, unknown> = {};
    for (const field of request.fields) {
      if (module.allowedFields.includes(field) && !module.restrictedFields?.includes(field) && Object.prototype.hasOwnProperty.call(request.values, field)) projectedFields[field] = request.values[field];
    }

    const allowedReferences = new Set([...module.contextReferences, ...this.registry.getRegistry().conversation.optionalReferences]);
    const projectedReferences: Record<string, unknown> = {};
    for (const reference of request.references ?? []) {
      if (allowedReferences.has(reference) && Object.prototype.hasOwnProperty.call(request.values, reference)) projectedReferences[reference] = request.values[reference];
    }

    return {
      policy: { registryId: this.registry.getRegistryId(), authorizationBeforeContext: true, databaseWriteAllowed: false, userConfirmationRequired: true as const },
      actor: { userId: request.actor.userId },
      module: { moduleId: request.moduleId, capability: request.capability },
      references: projectedReferences,
      fields: projectedFields,
    };
  }
}
