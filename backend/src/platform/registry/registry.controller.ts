import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';

import { ModuleLifecycleService } from './module-lifecycle.service';
import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
    private readonly lifecycle: ModuleLifecycleService,
  ) {}

  @Get()
  getAll() {
    return this.registry.getAll();
  }

  @Get('modules')
  getModules() {
    return this.registry.getAllModules();
  }

  @Get('fields')
  getFields() {
    return this.registry.getAllFields();
  }

  @Get('modules/status')
  getModuleStatuses() {
    return this.registry.getAllModules().map((module) =>
      this.lifecycle.getStatus(module.id),
    );
  }

  @Get(':name')
  getOne(@Param('name') name: string) {
    const resource = this.registry.get(name);

    if (!resource) {
      throw new NotFoundException(
        `Resource '${name}' not found`,
      );
    }

    return resource;
  }
}