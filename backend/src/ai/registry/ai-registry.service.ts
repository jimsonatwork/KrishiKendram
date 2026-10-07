import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AiModuleContract {
  moduleName: string;
  allowedCapabilities: string[];
  contextReferences: string[];
  allowedFields: string[];
  restrictedFields?: string[];
  candidateFactTargets: string[];
  confirmationPolicy: string;
  provenancePolicy: string;
  auditPolicy: string;
}

export interface AiContextRequest {
  moduleId: string;
  capability?: string;
  references?: string[];
  fields?: string[];
}

export interface AiRegistrySnapshot {
  registryId: string;
  version: number;
  status: string;
  modes: string[];
  capabilities: string[];
  contextPolicy: {
    id: string;
    defaultMode: string;
    authorizationBeforeContext: boolean;
    forbidden: string[];
  };
  conversation: {
    moduleId: string;
    requiredReferences: string[];
    optionalReferences: string[];
    entities: string[];
    factLifecycle: string[];
  };
  moduleContract: {
    required: string[];
    initialModules: string[];
  };
  modules: Record<string, AiModuleContract>;
  providerRules: {
    primaryExecution: string;
    cloudFallback: boolean;
    databaseWriteAllowed: boolean;
    registryValidationRequired: boolean;
    userConfirmationRequired: boolean;
    rawConversationTraining: boolean;
    approvedLearningPipelineRequired: boolean;
  };
  provenanceRequired: string[];
  godMode: {
    visible: boolean;
    controlAreas: string[];
    secretPolicy: string;
  };
}

@Injectable()
export class AiRegistryService {
  private readonly registryPath = resolve(
    process.cwd(),
    '..',
    'ai',
    'registry',
    'ai-platform-registry.json',
  );

  private readonly registry: AiRegistrySnapshot;

  constructor() {
    this.registry = JSON.parse(
      readFileSync(this.registryPath, 'utf8'),
    ) as AiRegistrySnapshot;

    this.validateRegistry();
  }

  getRegistry(): AiRegistrySnapshot {
    return structuredClone(this.registry);
  }

  getRegistryId(): string {
    return this.registry.registryId;
  }

  isCanonical(): boolean {
    return this.registry.status === 'CANONICAL';
  }

  getConversationModuleId(): string {
    return this.registry.conversation.moduleId;
  }

  getModule(moduleId: string): AiModuleContract {
    const module = this.registry.modules[moduleId];

    if (!module) {
      throw new NotFoundException(`AI module is not registered: ${moduleId}`);
    }

    return module;
  }

  assertModuleRegistered(moduleId: string): void {
    this.getModule(moduleId);
  }

  assertCapabilityAllowed(moduleId: string, capability: string): void {
    const module = this.getModule(moduleId);

    if (!this.registry.capabilities.includes(capability)) {
      throw new BadRequestException(`Unknown AI capability: ${capability}`);
    }

    if (!module.allowedCapabilities.includes(capability)) {
      throw new ForbiddenException(
        `AI capability ${capability} is not allowed for ${moduleId}`,
      );
    }
  }

  assertContextAllowed(request: AiContextRequest): void {
    const module = this.getModule(request.moduleId);

    if (request.capability) {
      this.assertCapabilityAllowed(request.moduleId, request.capability);
    }

    for (const reference of request.references ?? []) {
      const allowed =
        module.contextReferences.includes(reference) ||
        this.registry.conversation.optionalReferences.includes(reference);

      if (!allowed) {
        throw new ForbiddenException(
          `Context reference ${reference} is not allowed for ${request.moduleId}`,
        );
      }
    }

    for (const field of request.fields ?? []) {
      if (module.restrictedFields?.includes(field)) {
        throw new ForbiddenException(`Restricted AI field: ${field}`);
      }

      if (!module.allowedFields.includes(field)) {
        throw new ForbiddenException(
          `AI field ${field} is not allowed for ${request.moduleId}`,
        );
      }
    }
  }

  assertCanonicalWriteForbidden(): void {
    if (this.registry.providerRules.databaseWriteAllowed) {
      throw new ForbiddenException(
        'AI canonical database writes are disabled by KK-AI-REGISTRY-001',
      );
    }
  }

  requiresUserConfirmation(): boolean {
    return this.registry.providerRules.userConfirmationRequired;
  }

  requiresRegistryValidation(): boolean {
    return this.registry.providerRules.registryValidationRequired;
  }

  getAllowedCapabilities(moduleId: string): string[] {
    return [...this.getModule(moduleId).allowedCapabilities];
  }

  getProvenanceRequirements(): string[] {
    return [...this.registry.provenanceRequired];
  }

  private validateRegistry(): void {
    if (this.registry.registryId !== 'KK-AI-REGISTRY-001') {
      throw new Error('Invalid KK AI registry ID.');
    }

    if (this.registry.status !== 'CANONICAL') {
      throw new Error('KK AI registry is not canonical.');
    }

    if (this.registry.providerRules.databaseWriteAllowed !== false) {
      throw new Error(
        'Unsafe AI registry: direct database writes must remain disabled.',
      );
    }

    if (this.registry.providerRules.registryValidationRequired !== true) {
      throw new Error(
        'Unsafe AI registry: registry validation must remain enabled.',
      );
    }

    if (this.registry.providerRules.userConfirmationRequired !== true) {
      throw new Error(
        'Unsafe AI registry: user confirmation must remain enabled.',
      );
    }

    const requiredConversationReferences = ['userId', 'moduleId'];

    for (const reference of requiredConversationReferences) {
      if (!this.registry.conversation.requiredReferences.includes(reference)) {
        throw new Error(
          `Conversation registry is missing required reference: ${reference}`,
        );
      }
    }

    for (const moduleId of this.registry.moduleContract.initialModules) {
      this.getModule(moduleId);

      const module = this.registry.modules[moduleId];

      for (const required of this.registry.moduleContract.required) {
        if (!(required in module)) {
          throw new Error(
            `${moduleId} is missing registry contract field: ${required}`,
          );
        }
      }
    }
  }
}
