import { resolve } from 'node:path';
import { AiRegistryService } from './ai-registry.service';
import { RESOURCE_DEFINITIONS } from '../../platform/registry/definitions/resources';

describe('AI module and platform resource registry cohesion', () => {
  it('only advertises fact targets backed by registered platform resources', () => {
    const registry = new AiRegistryService(
      resolve(__dirname, '../../../../ai/registry/ai-platform-registry.json'),
    );
    const registeredModels = new Set(RESOURCE_DEFINITIONS.map((resource) => resource.model));
    const modules = registry.getRegistry().modules;

    for (const [moduleId, contract] of Object.entries(modules)) {
      for (const target of contract.candidateFactTargets) {
        expect({
          moduleId,
          target,
          registered: registeredModels.has(target),
        }).toEqual({ moduleId, target, registered: true });
      }
    }
  });

  it('keeps module apply-field allowlists in canonical contracts and aligned with platform fields', () => {
    const registry = new AiRegistryService(
      resolve(__dirname, '../../../../ai/registry/ai-platform-registry.json'),
    );
    const modules = registry.getRegistry().modules;

    for (const [moduleId, contract] of Object.entries(modules)) {
      for (const [target, fields] of Object.entries(contract.applyFields ?? {})) {
        const resource = RESOURCE_DEFINITIONS.find((item) => item.model === target);
        expect({ moduleId, target, advertised: contract.candidateFactTargets.includes(target), registered: Boolean(resource) })
          .toEqual({ moduleId, target, advertised: true, registered: true });
        for (const field of fields) {
          expect({
            moduleId,
            target,
            field,
            registered: Boolean(resource?.fields && Object.prototype.hasOwnProperty.call(resource.fields, field)),
          }).toEqual({ moduleId, target, field, registered: true });
        }
      }
    }
  });

  it('keeps the internal conversation module from targeting its own persistence tables as farmer facts', () => {
    const registry = new AiRegistryService(
      resolve(__dirname, '../../../../ai/registry/ai-platform-registry.json'),
    );
    expect(registry.getModule('KK-AI-CONVERSATION-001').candidateFactTargets).toEqual([]);
  });
});
