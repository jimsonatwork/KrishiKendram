import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AiRegistryService } from './ai-registry.service';

describe('AiRegistryService', () => {
  let service: AiRegistryService;

  beforeEach(() => {
    service = new AiRegistryService();
  });

  it('loads the canonical KK AI registry', () => {
    expect(service.getRegistryId()).toBe('KK-AI-REGISTRY-001');
    expect(service.isCanonical()).toBe(true);
  });

  it('recognizes the canonical conversation module', () => {
    expect(service.getConversationModuleId()).toBe('KK-AI-CONVERSATION-001');
  });

  it('accepts registered modules', () => {
    expect(() => service.assertModuleRegistered('KK-USER-001')).not.toThrow();

    expect(() => service.assertModuleRegistered('KK-FARM-001')).not.toThrow();
  });

  it('rejects unknown modules', () => {
    expect(() => service.assertModuleRegistered('KK-NOT-REGISTERED')).toThrow(
      NotFoundException,
    );
  });

  it('accepts an allowed capability', () => {
    expect(() =>
      service.assertCapabilityAllowed('KK-USER-001', 'CONVERSATION'),
    ).not.toThrow();
  });

  it('rejects an unknown capability', () => {
    expect(() =>
      service.assertCapabilityAllowed('KK-USER-001', 'NOT_A_REAL_CAPABILITY'),
    ).toThrow(BadRequestException);
  });

  it('rejects a capability not assigned to a module', () => {
    expect(() =>
      service.assertCapabilityAllowed('KK-USER-001', 'RECOMMENDATION'),
    ).toThrow(ForbiddenException);
  });

  it('accepts permitted context references', () => {
    expect(() =>
      service.assertContextAllowed({
        moduleId: 'KK-USER-001',
        capability: 'CONVERSATION',
        references: ['userId', 'screenId'],
        fields: ['identity'],
      }),
    ).not.toThrow();
  });

  it('rejects forbidden context fields', () => {
    expect(() =>
      service.assertContextAllowed({
        moduleId: 'KK-USER-001',
        fields: ['passwordHash'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects fields outside the module contract', () => {
    expect(() =>
      service.assertContextAllowed({
        moduleId: 'KK-USER-001',
        fields: ['paymentCredentials'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('keeps canonical database writes forbidden', () => {
    expect(() => service.assertCanonicalWriteForbidden()).not.toThrow();

    expect(service.requiresRegistryValidation()).toBe(true);
    expect(service.requiresUserConfirmation()).toBe(true);
  });
});
