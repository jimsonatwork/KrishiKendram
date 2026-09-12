import { Global, Module } from '@nestjs/common';

import { FieldValidationService } from './field-validation.service';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';

import { USER_FIELD_DEFINITIONS } from './definitions/fields/user-field-definitions';
import { FARM_FIELD_DEFINITIONS } from './definitions/fields/farm-field-definitions';
import { FARM_ASSET_FIELD_DEFINITIONS } from './definitions/fields/farm-asset-field-definitions';

import { RESOURCE_DEFINITIONS } from './definitions/resources';

import { FARM_RECORD_FIELD_DEFINITIONS } from './definitions/fields/farm-record-field-definitions';

@Global()
@Module({
  controllers: [RegistryController],
  providers: [RegistryService, FieldValidationService],
  exports: [RegistryService, FieldValidationService],
})
export class RegistryModule {
  constructor(private readonly registry: RegistryService) {
    this.registerResources();
    this.registerFields();
  }

  // START: Resource registration
  private registerResources(): void {
    for (const definition of RESOURCE_DEFINITIONS) {
      this.registry.register(definition);
    }
  }
  // END: Resource registration

  // START: Field registration
  private registerFields(): void {
    this.registry.registerField({
      name: 'name',
      type: 'string',
      description: 'Generic resource name.',
      validation: {
        required: false,
      },
      normalization: {
        trim: true,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'required',
        'minLength',
        'maxLength',
        'pattern',
      ],
    });

    for (const definition of USER_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of FARM_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of FARM_ASSET_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of FARM_RECORD_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }
  }
  // END: Field registration
}