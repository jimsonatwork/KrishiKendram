import { Injectable } from '@nestjs/common';

import {
  ModuleDefinition,
  ModuleLifecycleState,
} from './module-definition.interface';
import { RegistryService } from './registry.service';

export interface ModuleLifecycleStatus {
  moduleId: string;
  lifecycle: ModuleLifecycleState;
  operational: boolean;
  unavailableDependencies: string[];
}

@Injectable()
export class ModuleLifecycleService {
  constructor(
    private readonly registry: RegistryService,
  ) {}

  getState(moduleId: string): ModuleLifecycleState | undefined {
    return this.registry.getModule(moduleId)?.lifecycle;
  }

  // START: Lifecycle transition policy
  canTransition(
    from: ModuleLifecycleState,
    to: ModuleLifecycleState,
  ): boolean {
    if (from === to) {
      return false;
    }

    if (from === 'ACTIVE') {
      return to === 'DISABLED' || to === 'DEPRECATED';
    }

    if (from === 'DISABLED') {
      return to === 'ACTIVE';
    }

    if (from === 'DEPRECATED') {
      return to === 'ACTIVE' || to === 'DISABLED';
    }

    return false;
  }

  assertTransitionAllowed(
    from: ModuleLifecycleState,
    to: ModuleLifecycleState,
  ): void {
    if (this.canTransition(from, to)) {
      return;
    }

    throw new Error(
      `Invalid module lifecycle transition: ${from} -> ${to}.`,
    );
  }
  // END: Lifecycle transition policy

  isActive(moduleId: string): boolean {
    return this.getState(moduleId) === 'ACTIVE';
  }

  isOperational(moduleId: string): boolean {
    return this.getStatus(moduleId)?.operational ?? false;
  }

  getUnavailableDependencies(moduleId: string): string[] {
    return this.getStatus(moduleId)?.unavailableDependencies ?? [];
  }

  getStatus(moduleId: string): ModuleLifecycleStatus | undefined {
    const module = this.registry.getModule(moduleId);

    if (!module) {
      return undefined;
    }

    const unavailableDependencies =
      this.findUnavailableDependencies(module);

    return {
      moduleId: module.id,
      lifecycle: module.lifecycle,
      operational:
        module.lifecycle !== 'DISABLED' &&
        unavailableDependencies.length === 0,
      unavailableDependencies,
    };
  }

  // START: Dependency lifecycle evaluation
  private findUnavailableDependencies(
    module: ModuleDefinition,
  ): string[] {
    const unavailable: string[] = [];

    for (const dependencyId of module.dependencies ?? []) {
      const dependency = this.registry.getModule(dependencyId);

      if (
        !dependency ||
        dependency.lifecycle === 'DISABLED' ||
        !this.isDependencyOperational(dependency)
      ) {
        unavailable.push(dependencyId);
      }
    }

    return unavailable;
  }

  private isDependencyOperational(
    module: ModuleDefinition,
  ): boolean {
    for (const dependencyId of module.dependencies ?? []) {
      const dependency = this.registry.getModule(dependencyId);

      if (
        !dependency ||
        dependency.lifecycle === 'DISABLED' ||
        !this.isDependencyOperational(dependency)
      ) {
        return false;
      }
    }

    return true;
  }
  // END: Dependency lifecycle evaluation
}
