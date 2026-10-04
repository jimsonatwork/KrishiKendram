import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize } from 'node:path';

import definition from '../../../config/resource-paths.json';

type ResourcePathDefinition = typeof definition;

@Injectable()
export class FilesystemRegistryService {
  private readonly definition: ResourcePathDefinition = definition;

  getDefinition() {
    return {
      version: this.definition.version,
      root: this.definition.root,
      resources: Object.fromEntries(
        Object.entries(this.definition.resources).map(([key, relativePath]) => {
          const absolutePath = this.resolve(relativePath);
          return [key, {
            relativePath,
            absolutePath,
            exists: existsSync(absolutePath),
            kind: existsSync(absolutePath)
              ? statSync(absolutePath).isDirectory() ? 'directory' : 'file'
              : 'missing',
          }];
        }),
      ),
    };
  }

  resolveResource(name: keyof ResourcePathDefinition['resources']): string {
    const relativePath = this.definition.resources[name];
    if (!relativePath) throw new NotFoundException(`Filesystem resource '${String(name)}' is not registered.`);
    return this.resolve(relativePath);
  }

  private resolve(relativePath: string): string {
    return normalize(isAbsolute(relativePath) ? relativePath : join(this.definition.root, relativePath));
  }

  getConfigFilePath(): string {
    return join(dirname(__dirname), '../../../config/resource-paths.json');
  }
}
