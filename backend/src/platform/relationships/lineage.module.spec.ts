import 'reflect-metadata';
import { RESOURCE_LINEAGE_RESOLVER} from './lineage-resolution.types';
import { ResourceLineageResolverService } from './lineage-resolver.service';
import { LineageModule } from './lineage.module';

describe('LineageModule', () => {
  it('declares and exports the lineage resolver contract', () => {
    const providers = Reflect.getMetadata('providers', LineageModule) as any[];
    const exports = Reflect.getMetadata('exports', LineageModule) as any[];
    expect(providers).toContain(ResourceLineageResolverService);
    expect(providers).toEqual(
      expect.arrayContaining([expect.objectContaining({ provide: RESOURCE_LINEAGE_RESOLVER, useExisting: ResourceLineageResolverService })])
    );
    expect(exports).toContain(RESOURCE_LINEAGE_RESOLVER);
  });
});
