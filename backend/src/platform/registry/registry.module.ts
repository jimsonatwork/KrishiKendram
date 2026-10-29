import { forwardRef, Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';

import { FieldValidationService } from './field-validation.service';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import { ModuleLifecycleService } from './module-lifecycle.service';
import { FilesystemRegistryService } from './filesystem-registry.service';
import { CredentialArtifactService } from '../../credential-artifact.service';
import { SystemTruthService } from './system-truth.service';

import { USER_FIELD_DEFINITIONS } from './definitions/fields/user-field-definitions';
import { FARM_FIELD_DEFINITIONS } from './definitions/fields/farm-field-definitions';
import { FARM_ASSET_FIELD_DEFINITIONS } from './definitions/fields/farm-asset-field-definitions';
import { LIVESTOCK_FIELD_DEFINITIONS } from './definitions/fields/livestock-field-definitions';
import { MARKETPLACE_FIELD_DEFINITIONS } from './definitions/fields/marketplace-field-definitions';
import { MARKETPLACE_OFFERING_FIELD_DEFINITIONS } from './definitions/marketplace-offering-definitions';
import { INVENTORY_FIELD_DEFINITIONS } from './definitions/fields/inventory-field-definitions';
import { FINANCE_FIELD_DEFINITIONS } from './definitions/fields/finance-field-definitions';
import { REPORT_FIELD_DEFINITIONS } from './definitions/fields/report-field-definitions';
import { NOTIFICATION_FIELD_DEFINITIONS } from './definitions/fields/notification-field-definitions';
import { LIVESTOCK_RECORD_FIELD_DEFINITIONS } from './definitions/fields/livestock-record-field-definitions';

import { MODULE_DEFINITIONS } from './definitions/modules';
import { RESOURCE_DEFINITIONS } from './definitions/resources';

import { FARM_RECORD_FIELD_DEFINITIONS } from './definitions/fields/farm-record-field-definitions';

@Global()
@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [RegistryController],
  providers: [
    RegistryService,
    FieldValidationService,
    ModuleLifecycleService,
    FilesystemRegistryService,
    CredentialArtifactService,
    SystemTruthService,
  ],
  exports: [
    RegistryService,
    FieldValidationService,
    ModuleLifecycleService,
    FilesystemRegistryService,
    CredentialArtifactService,
    SystemTruthService,
  ],
})
export class RegistryModule {
  constructor(private readonly registry: RegistryService) {
    this.registerModules();
    this.registerResources();
    this.registerFields();
  }

  // START: Module registration
  private registerModules(): void {
    for (const definition of MODULE_DEFINITIONS) {
      this.registry.registerModule(definition);
    }
  }
  // END: Module registration

  // START: Resource registration
  private registerResources(): void {
    for (const definition of RESOURCE_DEFINITIONS) {
      if (!this.registry.hasModule(definition.module)) {
        throw new Error(
          `Resource '${definition.name}' references unregistered module '${definition.module}'.`,
        );
      }

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

    for (const definition of LIVESTOCK_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of MARKETPLACE_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of MARKETPLACE_OFFERING_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of INVENTORY_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of FINANCE_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of REPORT_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of NOTIFICATION_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of LIVESTOCK_RECORD_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }

    for (const definition of FARM_RECORD_FIELD_DEFINITIONS) {
      this.registry.registerField(definition);
    }
  }
  // END: Field registration
}