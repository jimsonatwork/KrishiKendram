import { Test } from '@nestjs/testing';

import { AuthorizationModule } from '../platform/authorization/authorization.module';
import { RelationshipsModule } from '../platform/relationships/relationships.module';

import { CropsController } from './crops.controller';
import { CropsModule } from './crops.module';
import { CropsService } from './crops.service';

describe('CropsModule', () => {
  it('resolves CropsService with relationship dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CropsModule],
    }).compile();

    expect(moduleRef.get(CropsController)).toBeDefined();
    expect(moduleRef.get(CropsService)).toBeDefined();
  });

  it('keeps the required platform modules available to the module graph', () => {
    expect(AuthorizationModule).toBeDefined();
    expect(RelationshipsModule).toBeDefined();
  });
});
