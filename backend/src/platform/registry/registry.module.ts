import { Global, Module } from '@nestjs/common';

import { FieldValidationService } from './field-validation.service';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import {
  USER_FIELD_DEFINITIONS,
  farmRecordCategoryField,
  farmRecordTitleField,
} from './user-field-definitions';

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

    this.registry.registerField(
      farmRecordCategoryField,
    );

    this.registry.registerField(
      farmRecordTitleField,
    );
  }

  private registerResources(): void {
  this.registry.register({
    name: 'user',
    model: 'User',

    fields: {
      name: {
        definition: 'userName',
        override: {
          validation: {
            required: true,
          },
        },
      },

      email: {
        definition: 'userEmail',
        override: {
          validation: {
            required: false,
          },
        },
      },

      mobile: {
        definition: 'userMobile',
      },

      preferredLanguage: {
        definition: 'userPreferredLanguage',
      },

      profileCompletion: {
        definition: 'userProfileCompletion',
      },
    },

    ownerField: 'id',

    searchableFields: [
      'name',
      'email',
      'mobile',
    ],

    sortableFields: [
      'name',
      'email',
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
      'GLOBAL',
    ],

    softDelete: true,
  });

  this.registry.register({
    name: 'farm',
    model: 'Farm',

    fields: {
      name: {
        definition: 'name',
        override: {
          validation: {
            required: true,
          },
        },
      },
    },

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

    fields: {
      name: {
        definition: 'name',
        override: {
          validation: {
            required: true,
          },
        },
      },
    },

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

    fields: {
      name: {
        definition: 'name',
        override: {
          validation: {
            maxLength: 100,
          },
        },
      },
    },

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

    fields: {
      category: {
        definition: 'farmRecordCategory',
      },
      title: {
        definition: 'farmRecordTitle',
      },
    },

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