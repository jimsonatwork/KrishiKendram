import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

export interface SystemTruth {
  schemaVersion: number;
  root: {
    wslPath: string;
    windowsPath: string;
    canonical: boolean;
    forbiddenProjectRoots: string[];
  };
  runtime: Record<string, unknown>;
  paths: Record<string, string>;
  configuration: Record<string, unknown>;
  authority: Record<string, unknown>;
  credentialPolicy: Record<string, unknown>;
  registry: Record<string, unknown>;
  godModeControlPlane: Record<string, unknown>;
  startupInvariant: Record<string, unknown>;
}

@Injectable()
export class SystemTruthService {
  private readonly filePath = resolve(process.cwd(), 'config', 'system-truth.json');

  async read(): Promise<SystemTruth> {
    const raw = JSON.parse(await readFile(this.filePath, 'utf8')) as SystemTruth;
    if (!raw.schemaVersion || !raw.root?.wslPath || raw.root.canonical !== true) {
      throw new Error('Invalid system-truth.json.');
    }
    if (resolve(process.cwd(), '..') !== resolve(raw.root.wslPath)) {
      throw new Error(`System Truth root mismatch. Expected ${raw.root.wslPath}.`);
    }
    return raw;
  }

  resolvePath(relativePath: string): string {
    if (isAbsolute(relativePath)) throw new Error('System Truth paths must be relative.');
    const root = resolve(process.cwd(), '..');
    const target = resolve(root, relativePath);
    if (target !== root && !target.startsWith(root + '/')) {
      throw new Error('System Truth path escapes the canonical project root.');
    }
    return target;
  }
}
