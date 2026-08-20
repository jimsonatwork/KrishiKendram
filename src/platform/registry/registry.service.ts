import { Injectable } from '@nestjs/common';

import { ResourceDefinition } from './resource-definition.interface';

@Injectable()
export class RegistryService {
  private readonly resources = new Map<string, ResourceDefinition>();

  register(definition: ResourceDefinition): void {
    this.resources.set(definition.name, definition);
  }

  get(name: string): ResourceDefinition | undefined {
    return this.resources.get(name);
  }

  getAll(): ResourceDefinition[] {
    return [...this.resources.values()];
  }

  has(name: string): boolean {
    return this.resources.has(name);
  }
}