import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

export interface AiModuleContract {
  moduleName: string;
  allowedCapabilities: string[];
  contextReferences: string[];
  allowedFields: string[];
  restrictedFields?: string[];
  candidateFactTargets: string[];
  applyFields: Record<string, string[]>;
  confirmationPolicy: string;
  provenancePolicy: string;
  auditPolicy: string;
}

export interface AiContextRequest {
  moduleId: string;
  capability?: string;
  references?: string[];
  fields?: string[];
}

/** Effective safety policy validated against the canonical AI registry. */
export interface AiEffectivePolicy {
  registryId: string;
  inventoryId: string;
  version: number;
  authorizationBeforeContext: true;
  centralRegistryValidationRequired: true;
  explicitUserConfirmationRequired: true;
  directAiDatabaseWriteAllowed: false;
  rawConversationTrainingAllowed: false;
  cloudFallbackAllowedByDefault: false;
}

export interface AiRegistrySnapshot {
  registryId: string;
  version: number;
  status: string;
  modes: string[];
  capabilities: string[];
  contextPolicy: {
    id: string;
    defaultMode: string;
    authorizationBeforeContext: boolean;
    forbidden: string[];
  };
  conversation: {
    moduleId: string;
    requiredReferences: string[];
    optionalReferences: string[];
    entities: string[];
    factLifecycle: string[];
  };
  moduleContract: {
    required: string[];
    initialModules: string[];
  };
  /** Canonical pointers to centrally stored AI inventories and governance docs. */
  linkedFiles: Record<string, string>;
  /** Canonical pointers to centrally stored, module-owned AI contracts. */
  moduleFiles: Record<string, string>;
  /** Hydrated from moduleFiles at startup; not duplicated in the root JSON. */
  modules: Record<string, AiModuleContract>;
  providerRules: {
    primaryExecution: string;
    cloudFallback: boolean;
    databaseWriteAllowed: boolean;
    registryValidationRequired: boolean;
    userConfirmationRequired: boolean;
    rawConversationTraining: boolean;
    approvedLearningPipelineRequired: boolean;
  };
  provenanceRequired: string[];
  godMode: {
    visible: boolean;
    controlAreas: string[];
    secretPolicy: string;
  };
}

@Injectable()
export class AiRegistryService {
  private readonly registryPath: string;

  private readonly registry: AiRegistrySnapshot;

  constructor(@Optional() registryPath?: string) {
    this.registryPath = registryPath ?? resolve(process.cwd(), '..', 'ai', 'registry', 'ai-platform-registry.json');
    const loaded = JSON.parse(
      readFileSync(this.registryPath, 'utf8'),
    ) as AiRegistrySnapshot;

    // The main AI registry is the sole entrypoint. Verify every linked inventory
    // and governance document before loading module contracts through the same map.
    for (const [linkId, relativeFile] of Object.entries(loaded.linkedFiles ?? {})) {
      const linkedPath = resolve(dirname(this.registryPath), relativeFile);
      if (!existsSync(linkedPath)) {
        throw new Error('Missing linked AI registry file ' + linkId + ': ' + linkedPath);
      }
    }

    // Module contracts are separate centrally governed files, hydrated for reuse.
    const modules: Record<string, AiModuleContract> = {};
    for (const [moduleId, relativeFile] of Object.entries(loaded.moduleFiles ?? {})) {
      const modulePath = resolve(dirname(this.registryPath), relativeFile);
      const document = JSON.parse(readFileSync(modulePath, 'utf8')) as {
        moduleId?: string;
        registryId?: string;
        version?: number;
        status?: string;
        contract?: AiModuleContract;
      };

      if (
        document.moduleId !== moduleId ||
        document.registryId !== loaded.registryId ||
        document.status !== 'CANONICAL' ||
        !document.contract
      ) {
        throw new Error('Invalid AI module contract ' + moduleId + ' at ' + modulePath + '.');
      }
      modules[moduleId] = document.contract;
    }

    this.registry = { ...loaded, modules };
    this.validateRegistry();
  }

  getRegistry(): AiRegistrySnapshot {
    return structuredClone(this.registry);
  }

  getRegistryId(): string {
    return this.registry.registryId;
  }

  /**
   * Reads the policy from the canonical linked file on every call.
   * Unsafe or inconsistent policy is rejected; callers must not fall back
   * to permissive defaults.
   */
  getEffectivePolicy(): AiEffectivePolicy {
    const relativeFile = this.registry.linkedFiles.policyIndex;
    if (!relativeFile) {
      throw new Error('Canonical AI policy index is not linked.');
    }

    const policyPath = resolve(dirname(this.registryPath), relativeFile);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(policyPath, 'utf8')) as unknown;
    } catch {
      throw new Error('Canonical AI policy index is missing or invalid JSON.');
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Canonical AI policy index must be a JSON object.');
    }

    const document = raw as Record<string, unknown>;
    const enforcement = document.enforcement;
    if (!enforcement || typeof enforcement !== 'object' || Array.isArray(enforcement)) {
      throw new Error('Canonical AI policy enforcement section is invalid.');
    }

    const rules = enforcement as Record<string, unknown>;
    const expected: Record<string, boolean> = {
      authorizationBeforeContext: true,
      centralRegistryValidationRequired: true,
      explicitUserConfirmationRequired: true,
      directAiDatabaseWriteAllowed: false,
      rawConversationTrainingAllowed: false,
      cloudFallbackAllowedByDefault: false,
    };

    if (
      document.registryId !== this.registry.registryId ||
      document.inventoryId !== 'KK-AI-POLICIES-001' ||
      document.status !== 'CANONICAL' ||
      !Number.isInteger(document.version) ||
      (document.version as number) < 1
    ) {
      throw new Error('Canonical AI policy identity, version, or status is invalid.');
    }

    for (const [key, expectedValue] of Object.entries(expected)) {
      if (rules[key] !== expectedValue) {
        throw new Error('Unsafe or inconsistent canonical AI policy: ' + key + '.');
      }
    }

    if (
      this.registry.contextPolicy.authorizationBeforeContext !== true ||
      this.registry.providerRules.databaseWriteAllowed !== false ||
      this.registry.providerRules.registryValidationRequired !== true ||
      this.registry.providerRules.userConfirmationRequired !== true ||
      this.registry.providerRules.cloudFallback !== false ||
      this.registry.providerRules.rawConversationTraining !== false
    ) {
      throw new Error('Canonical AI policy conflicts with mandatory registry safety rules.');
    }

    return {
      registryId: document.registryId as string,
      inventoryId: document.inventoryId as string,
      version: document.version as number,
      authorizationBeforeContext: true,
      centralRegistryValidationRequired: true,
      explicitUserConfirmationRequired: true,
      directAiDatabaseWriteAllowed: false,
      rawConversationTrainingAllowed: false,
      cloudFallbackAllowedByDefault: false,
    };
  }

  getGovernedFile(key: string): { key: string; value: unknown; sha256: string; byteLength: number } {
    const filePath = this.resolveGovernedFile(key);
    const raw = readFileSync(filePath);
    return { key, value: JSON.parse(raw.toString('utf8')) as unknown, sha256: createHash('sha256').update(raw).digest('hex'), byteLength: raw.byteLength };
  }

  getGovernedFileRevision(key: string): { key: string; sha256: string; byteLength: number } {
    const raw = readFileSync(this.resolveGovernedFile(key));
    return { key, sha256: createHash('sha256').update(raw).digest('hex'), byteLength: raw.byteLength };
  }

  listGovernedSnapshots(key: string): Array<{ snapshotId: string; sha256: string; byteLength: number }> {
    this.resolveGovernedFile(key);
    const repoRoot = resolve(dirname(this.registryPath), '..', '..');
    const snapshotDir = resolve(repoRoot, '.cto-backup', 'ai-registry-snapshots');
    if (!existsSync(snapshotDir)) return [];
    const directoryStat = lstatSync(snapshotDir);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
      throw new BadRequestException('AI registry snapshot directory must be a real directory.');
    }
    const realSnapshotDir = realpathSync(snapshotDir);
    const safeKey = key.replace(/[^A-Za-z0-9_-]/g, '_');
    return readdirSync(snapshotDir)
      .filter((name) => name.endsWith('.json') && name.includes('-' + safeKey + '-'))
      .flatMap((snapshotId) => {
        const snapshotPath = resolve(snapshotDir, snapshotId);
        const fileStat = lstatSync(snapshotPath);
        if (fileStat.isSymbolicLink() || !fileStat.isFile()) return [];
        const realSnapshotPath = realpathSync(snapshotPath);
        if (!realSnapshotPath.startsWith(realSnapshotDir + '/')) return [];
        const raw = readFileSync(realSnapshotPath);
        return [{ snapshotId, sha256: createHash('sha256').update(raw).digest('hex'), byteLength: raw.byteLength }];
      })
      .sort((a, b) => b.snapshotId.localeCompare(a.snapshotId));
  }

  restoreGovernedSnapshot(key: string, snapshotId: string, expectedSha256: string) {
    if (!snapshotId || snapshotId.includes('/') || snapshotId.includes('\\\\') || snapshotId.includes('..')) {
      throw new BadRequestException('Invalid AI registry snapshot identifier.');
    }
    const safeKey = key.replace(/[^A-Za-z0-9_-]/g, '_');
    if (!snapshotId.endsWith('.json') || !snapshotId.includes('-' + safeKey + '-')) {
      throw new BadRequestException('Snapshot does not belong to this AI configuration key.');
    }
    const allowed = this.listGovernedSnapshots(key);
    if (!allowed.some((item) => item.snapshotId === snapshotId)) {
      throw new NotFoundException('AI registry snapshot was not found.');
    }
    const snapshotDir = resolve(dirname(this.registryPath), '..', '..', '.cto-backup', 'ai-registry-snapshots');
    let snapshotRaw: string;
    let value: unknown;
    try { snapshotRaw = readFileSync(resolve(snapshotDir, snapshotId), 'utf8'); value = JSON.parse(snapshotRaw) as unknown; }
    catch { throw new BadRequestException('AI registry snapshot is not valid JSON.'); }
    this.assertNoSecretFields(value);
    this.validateGovernedDocument(key, value);
    return this.updateGovernedFile(key, value, expectedSha256, snapshotRaw);
  }

  updateGovernedFile(key: string, value: unknown, expectedSha256: string, serializedOverride?: string): {
    key: string; sha256: string; byteLength: number; snapshotFile: string; snapshotId: string;
  } {
    if (!expectedSha256 || !/^[a-f0-9]{64}$/i.test(expectedSha256)) throw new BadRequestException('A current SHA-256 revision token is required.');
    const filePath = this.resolveGovernedFile(key);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('AI configuration must be a JSON object.');
    const serialized = serializedOverride ?? (JSON.stringify(value, null, 2) + String.fromCharCode(10));
    if (Buffer.byteLength(serialized, 'utf8') > 256 * 1024) throw new BadRequestException('AI configuration exceeds the 256 KiB limit.');
    this.assertNoSecretFields(value);
    this.validateGovernedDocument(key, value);
    const previous = readFileSync(filePath);
    const currentHash = createHash('sha256').update(previous).digest('hex');
    if (currentHash !== expectedSha256.toLowerCase()) throw new ConflictException('AI configuration changed since it was loaded. Refresh before retrying.');
    const repoRoot = resolve(dirname(this.registryPath), '..', '..');
    const snapshotDir = resolve(repoRoot, '.cto-backup', 'ai-registry-snapshots');
    mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });
    const snapshotDirectoryStat = lstatSync(snapshotDir);
    if (snapshotDirectoryStat.isSymbolicLink() || !snapshotDirectoryStat.isDirectory()) {
      throw new BadRequestException('AI registry snapshot directory must be a real directory.');
    }
    const realSnapshotDir = realpathSync(snapshotDir);
    const expectedBackupRoot = realpathSync(resolve(repoRoot, '.cto-backup'));
    if (!realSnapshotDir.startsWith(expectedBackupRoot + '/')) {
      throw new BadRequestException('AI registry snapshot directory resolves outside the protected backup area.');
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeKey = key.replace(/[^A-Za-z0-9_-]/g, '_');
    const snapshotFile = resolve(snapshotDir, stamp + '-' + safeKey + '-' + currentHash.slice(0, 12) + '.json');
    writeFileSync(snapshotFile, previous, { mode: 0o600, flag: 'wx' });
    const tempFile = filePath + '.god-mode-tmp';
    try {
      writeFileSync(tempFile, serialized, { mode: 0o600 });
      renameSync(tempFile, filePath);
      new AiRegistryService(this.registryPath).getControlPlaneOverview();
    } catch {
      try { writeFileSync(tempFile, previous, { mode: 0o600 }); renameSync(tempFile, filePath); }
      catch { throw new Error('AI registry validation failed and automatic restore failed; snapshot: ' + snapshotFile); }
      throw new BadRequestException('AI configuration failed canonical validation; original file restored.');
    }
    const next = readFileSync(filePath);
    return { key, sha256: createHash('sha256').update(next).digest('hex'), byteLength: next.byteLength, snapshotFile, snapshotId: snapshotFile.split('/').pop() ?? snapshotFile };
  }

  private resolveGovernedFile(key: string): string {
    const inventoryKeys = new Set(['providerInventory', 'runtimeInventory', 'policyIndex', 'evaluationIndex', 'cloudConnectionPolicy']);
    let relativeFile: string | undefined;
    if (inventoryKeys.has(key)) relativeFile = this.registry.linkedFiles[key];
    else if (key.startsWith('module:')) relativeFile = this.registry.moduleFiles[key.slice(7)];
    if (!relativeFile) throw new NotFoundException('AI configuration key is not in the editable allowlist.');
    const root = resolve(dirname(this.registryPath), '..', '..');
    const target = resolve(dirname(this.registryPath), relativeFile);
    if (!target.startsWith(resolve(root, 'ai') + '/') || !target.endsWith('.json')) throw new BadRequestException('AI configuration target is outside the protected AI JSON area.');
    if (!existsSync(target)) throw new NotFoundException('Registered AI configuration file is missing.');
    const targetStat = lstatSync(target);
    if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
      throw new BadRequestException('AI configuration target must be a regular, non-symlink JSON file.');
    }
    const realAiRoot = realpathSync(resolve(root, 'ai'));
    const realTarget = realpathSync(target);
    if (!realTarget.startsWith(realAiRoot + '/')) {
      throw new BadRequestException('AI configuration target resolves outside the protected AI JSON area.');
    }
    return realTarget;
  }

  private assertNoSecretFields(value: unknown, path = '$'): void {
    if (Array.isArray(value)) { value.forEach((item, index) => this.assertNoSecretFields(item, path + '[' + index + ']')); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (/(password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)/i.test(key) && child !== false) throw new BadRequestException('Secret-bearing fields are forbidden in AI registry configuration.');
      this.assertNoSecretFields(child, path + '.' + key);
    }
  }

  private validateGovernedDocument(key: string, value: unknown): void {
    const doc = value as Record<string, unknown>;
    if (key.startsWith('module:')) {
      const moduleId = key.slice(7);
      if (doc.moduleId !== moduleId || doc.registryId !== 'KK-AI-REGISTRY-001' || doc.status !== 'CANONICAL' || !doc.contract || typeof doc.contract !== 'object' || Array.isArray(doc.contract)) throw new BadRequestException('Module identity, canonical status, or contract is invalid.');
      const contract = doc.contract as Record<string, unknown>;
      for (const field of ['moduleName', 'allowedCapabilities', 'contextReferences', 'allowedFields', 'restrictedFields', 'candidateFactTargets', 'applyFields', 'confirmationPolicy', 'provenancePolicy', 'auditPolicy']) if (!(field in contract)) throw new BadRequestException('Module contract is missing required field: ' + field);
      for (const field of ['allowedCapabilities', 'contextReferences', 'allowedFields', 'restrictedFields', 'candidateFactTargets']) if (!Array.isArray(contract[field]) || !(contract[field] as unknown[]).every((item) => typeof item === 'string')) throw new BadRequestException('Module contract array is invalid: ' + field);
      {
        const applyFields = contract.applyFields;
        if (!applyFields || typeof applyFields !== 'object' || Array.isArray(applyFields)) {
          throw new BadRequestException('Module applyFields must be an entity-to-field allowlist object.');
        }
        for (const [entityType, fields] of Object.entries(applyFields as Record<string, unknown>)) {
          if (!(contract.candidateFactTargets as string[]).includes(entityType)) {
            throw new BadRequestException('Module applyFields target is not in candidateFactTargets: ' + entityType);
          }
          if (!Array.isArray(fields) || !fields.every((item) => typeof item === 'string')) {
            throw new BadRequestException('Module applyFields entry must be an array of field IDs: ' + entityType);
          }
        }
      }
      return;
    }
    if (key === 'policyIndex') {
      const enforcement = doc.enforcement;
      if (
        doc.registryId !== 'KK-AI-REGISTRY-001' ||
        doc.inventoryId !== 'KK-AI-POLICIES-001' ||
        doc.status !== 'CANONICAL' ||
        !Number.isInteger(doc.version) ||
        (doc.version as number) < 1 ||
        !enforcement ||
        typeof enforcement !== 'object' ||
        Array.isArray(enforcement)
      ) {
        throw new BadRequestException('Canonical AI policy identity or enforcement structure is invalid.');
      }

      const rules = enforcement as Record<string, unknown>;
      const expected: Record<string, boolean> = {
        authorizationBeforeContext: true,
        centralRegistryValidationRequired: true,
        explicitUserConfirmationRequired: true,
        directAiDatabaseWriteAllowed: false,
        rawConversationTrainingAllowed: false,
        cloudFallbackAllowedByDefault: false,
      };
      for (const [field, expectedValue] of Object.entries(expected)) {
        if (rules[field] !== expectedValue) {
          throw new BadRequestException('Unsafe or invalid canonical AI policy field: ' + field + '.');
        }
      }
      if (!Array.isArray(doc.governedPolicyDocuments) ||
          !(doc.governedPolicyDocuments as unknown[]).every((item) => typeof item === 'string')) {
        throw new BadRequestException('Canonical AI policy document links are invalid.');
      }
      return;
    }

    if (key === 'cloudConnectionPolicy') {
      const policy = doc.policy;
      if (
        doc.registryId !== this.registry.registryId ||
        doc.inventoryId !== 'KK-AI-CLOUD-CONNECTION-POLICY-001' ||
        doc.status !== 'CANONICAL' ||
        doc.mode !== 'EXPLICIT_APPROVED_PRIMARY_ONLY' ||
        doc.enabled !== false ||
        !policy || typeof policy !== 'object' || Array.isArray(policy)
      ) {
        throw new BadRequestException('Cloud connection policy is invalid or attempts to enable an unverified cloud provider.');
      }
      const rules = policy as Record<string, unknown>;
      const required: Record<string, boolean> = {
        requiresGodModeAuthorization: true,
        requiresSuperAdminProposal: true,
        requiresUserConsentForEachCloudDisclosure: true,
        cloudFallbackAllowed: false,
        secretsMayBeStoredInThisFile: false,
        endpointMustUseHttps: true,
        providerMustBeLicenseReviewed: true,
        modelAndDatasetLicensesReviewedSeparately: true,
        healthAndCapabilityEvaluationRequired: true,
        disableAndRollbackRequired: true,
      };
      for (const [field, expected] of Object.entries(required)) {
        if (rules[field] !== expected) {
          throw new BadRequestException('Cloud connection safety invariant is invalid: ' + field + '.');
        }
      }
      return;
    }

    const collection = key === 'providerInventory' ? 'providers' : key === 'runtimeInventory' ? 'runtimes' : 'evaluations';
    if (!Array.isArray(doc[collection]) || (doc[collection] as unknown[]).length > 500 || (doc[collection] as unknown[]).some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new BadRequestException('AI inventory structure is invalid for ' + collection + '.');
  }

  /** Read-only, sanitized inventory for the God Mode control plane. */
  getControlPlaneOverview(): Record<string, unknown> {
    const readLinkedJson = (key: string): unknown => {
      const relativeFile = this.registry.linkedFiles[key];
      if (!relativeFile) return null;
      const filePath = resolve(dirname(this.registryPath), relativeFile);
      if (!existsSync(filePath)) return null;
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    };

    return {
      registryId: this.registry.registryId,
      version: this.registry.version,
      status: this.registry.status,
      modes: [...this.registry.modes],
      capabilities: [...this.registry.capabilities],
      contextPolicy: structuredClone(this.registry.contextPolicy),
      conversation: structuredClone(this.registry.conversation),
      providerRules: structuredClone(this.registry.providerRules),
      provenanceRequired: [...this.registry.provenanceRequired],
      moduleContracts: Object.entries(this.registry.modules).map(([moduleId, contract]) => ({
        moduleId,
        ...structuredClone(contract),
        manifestPath: this.registry.moduleFiles[moduleId],
      })),
      inventories: {
        providers: readLinkedJson('providerInventory'),
        runtimes: readLinkedJson('runtimeInventory'),
        policies: readLinkedJson('policyIndex'),
        evaluations: readLinkedJson('evaluationIndex'),
        cloudConnectionPolicy: this.getCloudConnectionPolicy(),
      },
      voiceIntents: this.getVoiceIntentDefinitions(),
      linkedFiles: structuredClone(this.registry.linkedFiles),
      moduleFiles: structuredClone(this.registry.moduleFiles),
      healthDiagnostics: this.getHealthDiagnostics(),
      safety: {
        directDatabaseWritesAllowed: this.registry.providerRules.databaseWriteAllowed,
        userConfirmationRequired: this.registry.providerRules.userConfirmationRequired,
        registryValidationRequired: this.registry.providerRules.registryValidationRequired,
        secretValuesExposed: false,
      },
    };
  }

  /**
   * Static, side-effect-free probes only: verifies that registered source files
   * exist. It does not execute providers, spawn processes, contact cloud APIs,
   * inspect secrets, or claim a model is operational merely because files exist.
   */
  getHealthDiagnostics(): Record<string, unknown> {
    const repoRoot = resolve(dirname(this.registryPath), '..', '..');
    const providerInventory = this.readInventoryForDiagnostics('providerInventory') as {
      providers?: Array<Record<string, unknown>>;
    } | null;
    const runtimeInventory = this.readInventoryForDiagnostics('runtimeInventory') as {
      runtimes?: Array<Record<string, unknown>>;
    } | null;
    const probePath = (relativePath: unknown) => {
      if (typeof relativePath !== 'string' || !relativePath.trim()) {
        return { declaredPath: null, filePresent: false, status: 'PATH_NOT_DECLARED' };
      }
      const candidate = resolve(repoRoot, relativePath);
      const insideRepo = candidate === repoRoot || candidate.startsWith(repoRoot + '/');
      if (!insideRepo) {
        return { declaredPath: relativePath, filePresent: false, status: 'PATH_OUTSIDE_REPOSITORY_BLOCKED' };
      }
      const present = existsSync(candidate);
      return { declaredPath: relativePath, filePresent: present, status: present ? 'FILE_PRESENT_NOT_EXECUTION_VERIFIED' : 'FILE_MISSING' };
    };

    const providers = (providerInventory?.providers ?? []).map((provider) => {
      const implementation = probePath(provider.implementation);
      const contract = probePath(provider.contract);
      return {
        providerId: provider.providerId ?? 'UNKNOWN_PROVIDER',
        declaredStatus: provider.status ?? 'UNSPECIFIED',
        executionMode: provider.executionMode ?? 'UNSPECIFIED',
        implementation,
        contract,
        ready: implementation.status === 'FILE_PRESENT_NOT_EXECUTION_VERIFIED'
          && contract.status === 'FILE_PRESENT_NOT_EXECUTION_VERIFIED'
          && provider.status === 'PRODUCTION_READY',
      };
    });
    const runtimes = (runtimeInventory?.runtimes ?? []).map((runtime) => {
      const implementation = probePath(runtime.implementation);
      return {
        runtimeId: runtime.runtimeId ?? 'UNKNOWN_RUNTIME',
        declaredStatus: runtime.runtimeStatus ?? 'UNSPECIFIED',
        declaredHealthStatus: runtime.healthStatus ?? 'UNSPECIFIED',
        implementation,
        ready: implementation.status === 'FILE_PRESENT_NOT_EXECUTION_VERIFIED'
          && runtime.runtimeStatus === 'READY'
          && runtime.healthStatus === 'HEALTHY',
      };
    });

    return {
      probeMode: 'STATIC_FILE_AND_PATH_CHECK_ONLY',
      executedProviderCode: false,
      networkChecksPerformed: false,
      secretValuesExposed: false,
      providers,
      runtimes,
      note: 'File presence is not proof of model/runtime health. Execution probes require a separately authorized, bounded provider-specific health contract.',
    };
  }

  private readInventoryForDiagnostics(key: string): unknown {
    const relativeFile = this.registry.linkedFiles[key];
    if (!relativeFile) return null;
    const filePath = resolve(dirname(this.registryPath), relativeFile);
    if (!existsSync(filePath)) return null;
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    } catch {
      return null;
    }
  }

  isCanonical(): boolean {
    return this.registry.status === 'CANONICAL';
  }

  getConversationModuleId(): string {
    return this.registry.conversation.moduleId;
  }

  /** Reads and validates the central cloud policy; credentials are prohibited. */
  getCloudConnectionPolicy(): Record<string, unknown> {
    const value = this.getGovernedFile('cloudConnectionPolicy').value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Canonical cloud connection policy must be a JSON object.');
    }
    this.assertNoSecretFields(value);
    this.validateGovernedDocument('cloudConnectionPolicy', value);
    return value as Record<string, unknown>;
  }

  getVoiceNavigationPrefixes(): string[] {
    const relativeFile = this.registry.linkedFiles.voiceIntents;
    if (!relativeFile) throw new Error('Canonical voice intent manifest is not linked.');
    const path = resolve(dirname(this.registryPath), relativeFile);
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    if (!Array.isArray(raw.navigationPrefixes) ||
        !raw.navigationPrefixes.every((prefix) => typeof prefix === 'string' && prefix.trim())) {
      throw new Error('Canonical voice navigation prefixes are invalid.');
    }
    return [...new Set(raw.navigationPrefixes as string[])];
  }

  /**
   * Canonical voice intent manifest. Validated on each read so stale or
   * malformed route policy fails closed instead of enabling guessed actions.
   */
  getVoiceIntentDefinitions(): Array<{
    intentId: string;
    label: string;
    phrases: string[];
    path: string;
    access: 'AUTHENTICATED' | 'SYSTEM_GOD';
    moduleId: string;
  }> {
    const relativeFile = this.registry.linkedFiles.voiceIntents;
    if (!relativeFile) throw new Error('Canonical voice intent manifest is not linked.');
    const path = resolve(dirname(this.registryPath), relativeFile);
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path, 'utf8')) as unknown; }
    catch { throw new Error('Canonical voice intent manifest is missing or invalid JSON.'); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Canonical voice intent manifest must be a JSON object.');
    }
    const document = raw as Record<string, unknown>;
    if (document.registryId !== this.registry.registryId ||
        document.inventoryId !== 'KK-AI-VOICE-INTENTS-001' ||
        document.status !== 'CANONICAL' || !Number.isInteger(document.version) ||
        !Array.isArray(document.intents)) {
      throw new Error('Canonical voice intent manifest identity or structure is invalid.');
    }
    const seen = new Set<string>();
    const intents = document.intents.map((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Voice intent entry must be an object.');
      }
      const intent = value as Record<string, unknown>;
      if (typeof intent.intentId !== 'string' || !intent.intentId.trim() ||
          seen.has(intent.intentId) ||
          typeof intent.label !== 'string' ||
          !Array.isArray(intent.phrases) || intent.phrases.length === 0 ||
          !intent.phrases.every((phrase) => typeof phrase === 'string' && phrase.trim()) ||
          typeof intent.path !== 'string' || !(intent.path === '/app' || intent.path.startsWith('/app/')) ||
          (intent.access !== 'AUTHENTICATED' && intent.access !== 'SYSTEM_GOD') ||
          typeof intent.moduleId !== 'string' || !this.registry.moduleFiles[intent.moduleId]) {
        throw new Error('Canonical voice intent entry is invalid.');
      }
      if (intent.access === 'SYSTEM_GOD' && !(intent.path === '/app' || intent.path.startsWith('/app/'))) {
        throw new Error('Privileged voice intent must target a specific application route.');
      }
      seen.add(intent.intentId);
      return {
        intentId: intent.intentId,
        label: intent.label,
        phrases: intent.phrases as string[],
        path: intent.path,
        access: intent.access as 'AUTHENTICATED' | 'SYSTEM_GOD',
        moduleId: intent.moduleId,
      };
    });
    return intents;
  }

  getModule(moduleId: string): AiModuleContract {
    const module = this.registry.modules[moduleId];

    if (!module) {
      throw new NotFoundException(`AI module is not registered: ${moduleId}`);
    }

    return module;
  }

  assertModuleRegistered(moduleId: string): void {
    this.getModule(moduleId);
  }

  assertCapabilityAllowed(moduleId: string, capability: string): void {
    const module = this.getModule(moduleId);

    if (!this.registry.capabilities.includes(capability)) {
      throw new BadRequestException(`Unknown AI capability: ${capability}`);
    }

    if (!module.allowedCapabilities.includes(capability)) {
      throw new ForbiddenException(
        `AI capability ${capability} is not allowed for ${moduleId}`,
      );
    }
  }

  assertContextAllowed(request: AiContextRequest): void {
    const module = this.getModule(request.moduleId);

    if (request.capability) {
      this.assertCapabilityAllowed(request.moduleId, request.capability);
    }

    // A globally known reference is not automatically authorized for every module.
    // The requesting module's own contract is the allowlist; this prevents cross-module
    // context leakage (for example, a user assistant requesting farm/crop records).
    for (const reference of request.references ?? []) {
      if (!module.contextReferences.includes(reference)) {
        throw new ForbiddenException(
          `Context reference ${reference} is not allowed for ${request.moduleId}`,
        );
      }
    }

    for (const field of request.fields ?? []) {
      if (module.restrictedFields?.includes(field)) {
        throw new ForbiddenException(`Restricted AI field: ${field}`);
      }

      if (!module.allowedFields.includes(field)) {
        throw new ForbiddenException(
          `AI field ${field} is not allowed for ${request.moduleId}`,
        );
      }
    }
  }

  assertCanonicalWriteForbidden(): void {
    if (this.registry.providerRules.databaseWriteAllowed) {
      throw new ForbiddenException(
        'AI canonical database writes are disabled by KK-AI-REGISTRY-001',
      );
    }
  }

  requiresUserConfirmation(): boolean {
    return this.registry.providerRules.userConfirmationRequired;
  }

  requiresRegistryValidation(): boolean {
    return this.registry.providerRules.registryValidationRequired;
  }

  getAllowedCapabilities(moduleId: string): string[] {
    return [...this.getModule(moduleId).allowedCapabilities];
  }

  getProvenanceRequirements(): string[] {
    return [...this.registry.provenanceRequired];
  }

  private validateRegistry(): void {
    // Validate the external canonical policy at startup. Unsafe policy prevents
    // the AI registry from being constructed.
    this.getEffectivePolicy();
    this.getVoiceIntentDefinitions();
    this.getVoiceNavigationPrefixes();
    this.getCloudConnectionPolicy();

    if (this.registry.registryId !== 'KK-AI-REGISTRY-001') {
      throw new Error('Invalid KK AI registry ID.');
    }

    if (this.registry.status !== 'CANONICAL') {
      throw new Error('KK AI registry is not canonical.');
    }

    if (this.registry.providerRules.databaseWriteAllowed !== false) {
      throw new Error(
        'Unsafe AI registry: direct database writes must remain disabled.',
      );
    }

    if (this.registry.providerRules.registryValidationRequired !== true) {
      throw new Error(
        'Unsafe AI registry: registry validation must remain enabled.',
      );
    }

    if (this.registry.providerRules.userConfirmationRequired !== true) {
      throw new Error(
        'Unsafe AI registry: user confirmation must remain enabled.',
      );
    }

    const requiredConversationReferences = ['userId', 'moduleId'];

    for (const reference of requiredConversationReferences) {
      if (!this.registry.conversation.requiredReferences.includes(reference)) {
        throw new Error(
          `Conversation registry is missing required reference: ${reference}`,
        );
      }
    }

    for (const moduleId of this.registry.moduleContract.initialModules) {
      if (!this.registry.moduleFiles[moduleId]) {
        throw new Error("AI module '" + moduleId + "' has no central module-file entry.");
      }
      this.getModule(moduleId);

      const module = this.registry.modules[moduleId];

      for (const required of this.registry.moduleContract.required) {
        if (!(required in module)) {
          throw new Error(
            `${moduleId} is missing registry contract field: ${required}`,
          );
        }
      }
      if (!module.applyFields || typeof module.applyFields !== 'object' || Array.isArray(module.applyFields)) {
        throw new Error('Module ' + moduleId + ' has an invalid applyFields allowlist.');
      }
      for (const [target, fields] of Object.entries(module.applyFields)) {
        if (!module.candidateFactTargets.includes(target) || !Array.isArray(fields) || !fields.every((field) => typeof field === 'string')) {
          throw new Error('Module ' + moduleId + ' has an invalid applyFields target: ' + target + '.');
        }
      }
    }
  }
}
