import { Global, Module } from '@nestjs/common';

import { FieldValidationService } from './field-validation.service';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import {
  USER_FIELD_DEFINITIONS,
  farmRecordCategoryField,
  farmRecordTitleField,
} from './definitions/fields/user-field-definitions';
import { FARM_FIELD_DEFINITIONS } from './definitions/fields/farm-field-definitions';
import { userResource } from './definitions/resources/user.resource';
import { farmResource } from './definitions/resources/farm.resource';
import { cropResource } from './definitions/resources/crop.resource';
import { farmAssetResource } from './definitions/resources/farm-asset.resource';
import { farmRecordResource } from './definitions/resources/farm-record.resource';

@Global()
@Module({
  controllers: [RegistryController],
  providers: [
    FieldValidationService,
    RegistryService,
  ],
  exports: [RegistryService],
})
export class RegistryModule {
  constructor(private readonly registry: RegistryService) {
    this.registerFields();
    this.registerResources();
  }

  private registerFields(): void {
    this.registry.registerField({
      name: 'name',
      type: 'string',
      description: 'Standard reusable human-readable name.',
      validation: {
        required: false,
        minLength: 1,
        maxLength: 200,
      },
      normalization: {
        trim: true,
      },
      overrideMode: 'EXTENDABLE',
      overridableValidation: [
        'required',
        'minLength',
        'maxLength',
      ],
    });

    for (const definition of USER_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of FARM_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    this.registry.registerField(
      farmRecordCategoryField,
    );

    this.registry.registerField(
      farmRecordTitleField,
    );
  }

  private registerResources(): void {
    this.registry.register(userResource);

    this.registry.register(farmResource);

    this.registry.register(cropResource);

    this.registry.register(farmAssetResource);

    this.registry.register(farmRecordResource);
  }
}
