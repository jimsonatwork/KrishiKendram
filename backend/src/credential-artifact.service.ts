import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import config from '../config/credential-artifact.json';

@Injectable()
export class CredentialArtifactService {
  private readonly directory = resolve(process.cwd(), 'config', 'god-mode');
  getSettings() { return { ...config, version: 2, patternDescription: 'Last six characters of the generated God Mode password', patternExample: '<last-six>', patternFileFormat: '<last-six>.txt', passwordFileFormat: 'god-password.txt', artifactDirectory: this.directory }; }

  async updateSettings(input: { createPatternFile?: boolean; createPasswordFile?: boolean }) {
    const next = { ...this.getSettings(),
      ...(input.createPatternFile !== undefined ? { createPatternFile: Boolean(input.createPatternFile) } : {}),
      ...(input.createPasswordFile !== undefined ? { createPasswordFile: Boolean(input.createPasswordFile) } : {}),
    };
    const path = resolve(process.cwd(), 'config/credential-artifact.json');
    await writeFile(path, JSON.stringify({ ...next, artifactDirectory: 'config/god-mode' }, null, 2) + '\n', 'utf8');
    return next;
  }

  async writeDiagnosticFiles(password: string) {
    await mkdir(this.directory, { recursive: true });
    const result: { patternFile?: string; passwordFile?: string; passwordSecondaryFile?: string } = {};
    const settings = this.getSettings();
    if (settings.createPatternFile) {
      const pattern = password.slice(-6);
      const patternFile = join(this.directory, pattern + '.txt');
      await writeFile(patternFile, pattern + '\n', { encoding: 'utf8', mode: 0o600 });
      result.patternFile = patternFile;
    }
    if (settings.createPasswordFile) {
      const passwordFile = join(this.directory, 'rootnodepass.txt');
      const passwordSecondaryFile = join(this.directory, 'rootnodepass.kkt');
      await writeFile(passwordFile, password + '\n', { encoding: 'utf8', mode: 0o600 });
      await writeFile(passwordSecondaryFile, password + '\n', { encoding: 'utf8', mode: 0o600 });
      result.passwordFile = passwordFile;
      result.passwordSecondaryFile = passwordSecondaryFile;
    }
    return result;
  }

  async status() {
    const files = existsSync(this.directory) ? await readdir(this.directory) : [];
    return { ...this.getSettings(), files: files.filter((name) => ['.txt', '.kkt'].some((extension) => name.toLowerCase().endsWith(extension))).sort() };
  }

  async clearDiagnosticFiles() {
    if (!existsSync(this.directory)) return;
    for (const name of await readdir(this.directory)) {
      if (['.txt', '.kkt'].some((extension) => name.toLowerCase().endsWith(extension))) await rm(join(this.directory, name), { force: true });
    }
  }
}
