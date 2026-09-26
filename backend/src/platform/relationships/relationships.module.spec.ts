import {
  RESOURCE_RELATIONSHIP_RESOLVER,
  ResourceRelationshipResolver,
} from './relationship-resolution.types';
import { ResourceRelationshipResolverService } from './relationship-resolver.service';
import { RelationshipsModule } from './relationships.module';

describe('RelationshipsModule', () => {
  it('declares the resolver service as a provider', () => {
    const metadata = Reflect.getMetadata('providers', RelationshipsModule) as
      | unknown[]
      | undefined;

    expect(metadata).toContain(ResourceRelationshipResolverService);
  });

  it('binds the resolver contract to the existing resolver service', () => {
    const metadata = Reflect.getMetadata('providers', RelationshipsModule) as
      | Array<
          | unknown
          | {
              provide: unknown;
              useExisting: unknown;
            }
        >
      | undefined;

    expect(metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: RESOURCE_RELATIONSHIP_RESOLVER,
          useExisting: ResourceRelationshipResolverService,
        }),
      ]),
    );
  });

  it('exports the resolver contract', () => {
    const metadata = Reflect.getMetadata('exports', RelationshipsModule) as
      | unknown[]
      | undefined;

    expect(metadata).toContain(RESOURCE_RELATIONSHIP_RESOLVER);
  });
});
