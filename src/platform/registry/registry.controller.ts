import { Controller, Get, Param } from '@nestjs/common';

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

  @Get(':name')
  getOne(@Param('name') name: string) {
    return this.registry.get(name);
  }
}