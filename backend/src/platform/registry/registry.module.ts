import { Global, Module } from '@nestjs/common';

import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';

@Global()
@Module({
  controllers: [RegistryController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {
  constructor(private readonly registry: RegistryService) {
    this.registerResources();
  }

  private registerResources(): void {
  this.registry.register({
    name: 'farm',
    model: 'Farm',
    ownerField: 'ownerId',

    searchableFields: [
      'name',
      'type',
      'location',
    ],

    sortableFields: [
      'name',
      'area',
      'createdAt',
      'updatedAt',
    ],

    defaultSort: 'createdAt:desc',

    permissions: [
      'READ',
      'CREATE',
      'UPDATE',
      'DELETE',
    ],

    scopes: [
      'OWN',
      'GLOBAL',
    ],

    features: [
      'assets',
      'records',
    ],

    softDelete: false,
  });

  this.registry.register({
    name: 'crop',
    model: 'Crop',
    ownerField: 'farm.ownerId',

    searchableFields: [
      'name',
      'variety',
      'season',
      'status',
    ],

    sortableFields: [
      'name',
      'season',
      'status',
      'area',
      'createdAt',
      'updatedAt',
    ],

    defaultSort: 'createdAt:desc',

    permissions: [
      'READ',
      'CREATE',
      'UPDATE',
      'DELETE',
    ],

    scopes: [
      'OWN',
      'FARM',
      'GLOBAL',
    ],

    features: [
      'soft-delete',
    ],

    softDelete: true,
  });

  this.registry.register({
    name: 'farmAsset',
    model: 'FarmAsset',
    ownerField: 'farm.ownerId',

    searchableFields: [
      'type',
      'name',
    ],

    sortableFields: [
      'type',
      'name',
      'quantity',
      'createdAt',
    ],

    defaultSort: 'createdAt:desc',

    permissions: [
      'READ',
      'CREATE',
      'UPDATE',
      'DELETE',
    ],

    scopes: [
      'OWN',
      'FARM',
      'GLOBAL',
    ],

    softDelete: false,
  });

  this.registry.register({
    name: 'farmRecord',
    model: 'FarmRecord',
    ownerField: 'farm.ownerId',

    searchableFields: [
      'category',
      'title',
    ],

    sortableFields: [
      'category',
      'title',
      'createdAt',
    ],

    defaultSort: 'createdAt:desc',

    permissions: [
      'READ',
      'CREATE',
      'UPDATE',
      'DELETE',
    ],

    scopes: [
      'OWN',
      'FARM',
      'GLOBAL',
    ],

    softDelete: false,
  });
}
}