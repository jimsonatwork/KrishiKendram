import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import config from '../config/credential-artifact.json';
import { buildAtplaceFilename } from './bootstrap-pattern';

@Injectable()
export class CredentialArtifactService {
  private readonly directory = resolve(process.cwd(), config.artifactDirectory);
  getSettings() { return { ...config, artifactDirectory: this.directory }; }

  async updateSettings(input: { createPatternFile?: boolean; createPasswordFile?: boolean }) {
    const next = { ...config,
      ...(input.createPatternFile !== undefined ? { createPatternFile: Boolean(input.createPatternFile) } : {}),
      ...(input.createPasswordFile !== undefined ? { createPasswordFile: Boolean(input.createPasswordFile) } : {}),
    };
    const path = resolve(process.cwd(), 'config/credential-artifact.json');
    await writeFile(path, JSON.stringify(next, null, 2) + '\n', 'utf8');
    Object.assign(config, next);
    return this.getSettings();
  }

  async writeDiagnosticFiles(password: string) {
    await mkdir(this.directory, { recursive: true });
    const result: { patternFile?: string; passwordFile?: string } = {};
    if (config.createPatternFile) {
      const patternFile = join(this.directory, buildAtplaceFilename().replace(/\.svg$/i, '.txt'));
      await writeFile(patternFile, '', 'utf8');
      result.patternFile = patternFile;
    }
    if (config.createPasswordFile) {
      const passwordFile = join(this.directory, password + '.txt');
      await writeFile(passwordFile, '', 'utf8');
      result.passwordFile = passwordFile;
    }
    return result;
  }

  async status() {
    const files = existsSync(this.directory) ? await readdir(this.directory) : [];
    return { ...this.getSettings(), files: files.filter((name) => name.toLowerCase().endsWith('.txt')).sort() };
  }

  async clearDiagnosticFiles() {
    if (!existsSync(this.directory)) return;
    for (const name of await readdir(this.directory)) {
      if (name.toLowerCase().endsWith('.txt')) await rm(join(this.directory, name), { force: true });
    }
  }
}
