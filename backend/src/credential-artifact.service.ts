import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

@Injectable()
export class CredentialArtifactService {
  private readonly directory = resolve(process.cwd(), 'config', 'god-mode');
  private readonly passwordFile = 'rootpathss';
  private readonly passwordSecondaryFile = 'rootpathss.kkt';

  getSettings() {
    return {
      version: 3,
      createPatternFile: false,
      createPasswordFile: true,
      patternDescription: 'Disabled; canonical God Mode credential files are immutable.',
      patternExample: null,
      patternFileFormat: null,
      passwordFileFormat: 'rootpathss',
      passwordSecondaryFileFormat: 'rootpathss.kkt',
      artifactDirectory: this.directory,
      canonical: true,
    };
  }

  async updateSettings(_input: { createPatternFile?: boolean; createPasswordFile?: boolean }) {
    return this.getSettings();
  }

  async writeGodModeCredential(password: string) {
    await mkdir(this.directory, { recursive: true });
    for (const entry of await readdir(this.directory)) {
      if (entry.endsWith('.txt') || entry.endsWith('.kkt')) {
        await rm(join(this.directory, entry), { force: true });
      }
    }
    const passwordPath = join(this.directory, this.passwordFile);
    const secondaryPath = join(this.directory, this.passwordSecondaryFile);
    await writeFile(passwordPath, password + '\n', { encoding: 'utf8', mode: 0o600 });
    await writeFile(secondaryPath, password + '\n', { encoding: 'utf8', mode: 0o600 });
    await chmod(passwordPath, 0o600);
    await chmod(secondaryPath, 0o600);
    return { passwordFile: passwordPath, passwordSecondaryFile: secondaryPath };
  }

  async writeDiagnosticFiles(password: string) {
    return this.writeGodModeCredential(password);
  }

  async status() {
    const passwordPath = join(this.directory, this.passwordFile);
    const secondaryPath = join(this.directory, this.passwordSecondaryFile);
    const [passwordStat, secondaryStat] = await Promise.all([
      stat(passwordPath).catch(() => null),
      stat(secondaryPath).catch(() => null),
    ]);
    return {
      ...this.getSettings(),
      files: [this.passwordFile, this.passwordSecondaryFile].filter((name) => existsSync(join(this.directory, name))),
      passwordFilePresent: Boolean(passwordStat),
      secondaryFilePresent: Boolean(secondaryStat),
      passwordLastModifiedAt: passwordStat?.mtime.toISOString() ?? null,
      passwordValueExposed: false,
    };
  }

  async clearDiagnosticFiles() {
    if (!existsSync(this.directory)) return;
    for (const name of await readdir(this.directory)) {
      if (name.endsWith('.txt') || name.endsWith('.kkt')) await rm(join(this.directory, name), { force: true });
    }
  }
}
