import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';

import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
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