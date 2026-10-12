# KK-AI-PLATFORM-REGISTRY-001 — Central AI Boundary & Context Registry

**Status:** CANONICAL
**Version:** 1

## Core rule
AI is an intelligence layer, not a system of record.

Canonical chain:

User/Module -> Authorization -> Context Policy -> AI -> Candidate Output -> Registry Validation -> User Confirmation -> Canonical Service -> Audit/History

AI must never bypass this chain.

## AI understanding of KK
AI receives purpose-bound context assembled from authorized canonical records, not an unrestricted User dump.

Context may contain canonical User references, relevant profile/facts/preferences, current module/screen/entity, relevant history and permitted module fields. Secrets and unrelated protected data are excluded.

## Conversation boundary
Conversation is a first-class platform capability and is stored separately from User and domain entities.

Minimum association: userId, moduleId.

Optional association: screenId, entityType, entityId, sessionId, farmId, cropId, cropCycleId, livestockId, marketplace record reference.

Core entities: Conversation, ConversationSession, ConversationParticipant, ConversationMessage, ConversationContext, ConversationReference, ConversationFactCandidate, ConversationAction.

## Candidate fact boundary
AI-extracted information first becomes ConversationFactCandidate.

It carries conversation, user and module references, target entity/field, proposed value, previous value where relevant, confidence, source, evidence, validation state, confirmation state, resolution and provenance.

Lifecycle:
DETECTED -> NORMALIZED -> VALIDATION_PENDING -> AWAITING_CONFIRMATION -> CONFIRMED -> APPLIED

Alternative states: CONFLICT, REJECTED, SUPERSEDED, EXPIRED.

A candidate is never authoritative merely because an AI model produced it.

## Module AI contract
Every AI-consuming module registers:
- stable module ID;
- allowed capabilities;
- allowed context references;
- allowed fields;
- restricted fields;
- candidate fact targets;
- confirmation requirements;
- provenance requirements;
- audit requirements.

Initial associations:
- KK-USER-001 Canonical User Foundation
- KK-FARM-001 Farm
- KK-CROP-001 Crop
- KK-LIVESTOCK-001 Livestock
- KK-MARKETPLACE-001 Marketplace

Additional modules register before consuming protected AI context.

## Authorization order
1. Authenticate.
2. Authorize action.
3. Resolve module/entity context.
4. Apply field/privacy policy.
5. Assemble minimum context.
6. Invoke AI.
7. Validate output.
8. Request confirmation where required.
9. Persist through canonical service/API.
10. Audit/history/provenance.

AI cannot expand its own access.

## Provider abstraction
Providers are replaceable. Initial local ASR is KK-AI-ASR-INDIC-CONFORMER. Future provider categories include conversation, speech, TTS, vision, document extraction, matching, consistency, classification and recommendation.

## Learning boundary
Raw conversations are not silently used to retrain models.

Governed learning:
Conversation -> Candidate -> Validation -> Confirmation -> Canonical Outcome -> Evaluation Dataset -> Review -> Approved Model/Prompt/Policy Version

Learning data requires provenance, privacy, retention and approval.

## God Mode
God Mode must expose providers/models, capabilities, context policies, module associations, field access, conversation policy, fact lifecycle, confirmation, provenance, AI audit and learning governance.

Never expose credentials.


## Central file entrypoint and module contract layout

The application-wide filesystem registry is `backend/config/resource-paths.json`. It registers the AI root, the single AI platform registry entrypoint, the central module-contract directory, provider/runtime/policy/evaluation directories, and the governing AI documentation paths. Platform tools should resolve these registered resources rather than hardcode new paths in pages or services.

The canonical AI entrypoint is `ai/registry/ai-platform-registry.json` (`KK-AI-REGISTRY-001`). It owns shared capabilities, global context/provider safety rules, conversation/fact lifecycle, God Mode control areas, and the manifest mapping each stable module ID to its contract file. The root file must not duplicate module contract bodies.

Each module contract lives under `ai/modules/<MODULE-ID>.json`. These files are centrally located and governed, but separately owned/versioned by module. Backend `AiRegistryService` loads the canonical entrypoint, resolves the manifest paths relative to that entrypoint, verifies each file's module ID, registry ID and canonical status, and hydrates the contracts for common authorization/context checks. Missing or mismatched contracts must fail startup rather than silently weaken policy.

Shared rules belong in the root registry once. Only module-specific allowed capabilities, context references, fields, restricted fields, candidate targets and confirmation/provenance/audit policies belong in module contract files. Provider-specific configuration must similarly be registered by stable ID and never copied into individual module files. Secret values must never be committed in these JSON files; only secret references belong in configuration.

Adding a module means: create its centrally stored contract, add its stable ID/path to the canonical manifest and initial-module list when applicable, add tests, then verify backend build and AI registry tests. A module must not create a private competing AI registry.


## God Mode read-only inventory endpoint

God Mode exposes the sanitized AI control-plane inventory at `GET /api/v1/admin/god-mode/ai-control-plane`. It uses the existing JWT guard and immutable God identity check. The frontend section reads this endpoint and renders centrally linked module contracts, provider/runtime inventory, registered paths and safety posture. Inventory entries do not prove installed models are healthy or production-ready. Governed edits are exposed separately through the revision-checked file editor documented below.

Eight AI domains are also registered in the existing God Configuration Registry: control plane, module contracts, providers, runtimes, policies, evaluations, cost/scale, and voice/conversation. These are governance metadata; the canonical AI JSON files remain the editable source for registered inventories/contracts. Edits validate the document, preserve a snapshot, reload the canonical registry, audit the transaction and support guarded rollback.

The control-plane response now includes `healthDiagnostics` generated by side-effect-free static probes. These verify whether declared implementation/contract files exist and whether declared paths remain inside the repository. The response labels this as `STATIC_FILE_AND_PATH_CHECK_ONLY`, reports that provider code and network checks were not executed, and does not expose secrets. A provider/runtime is not considered ready solely because its files exist; production readiness still requires a bounded, provider-specific execution health contract, dependency/model integrity checks, and integration tests. Current inventory metadata intentionally reports the ASR implementation as a placeholder.


### Verified implementation checkpoint — 2026-10-11

Backend build and focused registry tests pass; frontend production build passes. The built backend has been restarted, API/UI health checks return HTTP 200, and the new AI inventory route is present and protected (unauthenticated request returns HTTP 401). Eight AI domains are seeded in the existing God Configuration Registry. Governed file-backed editing, revision conflict checks, snapshots, guarded rollback and audit-completion recovery are now implemented; current inventory remains read-only unless an authorized God Mode edit is explicitly submitted.


## God Mode governed JSON editing and recovery (2026-10-11)

God Mode edits are restricted to the registered AI inventories and module contracts. Every write requires the currently loaded SHA-256 revision and a reason, validates the document, saves a pre-change snapshot, reloads the canonical registry, and restores the original bytes if canonical validation fails. A change-request audit record is written before mutation; if the completion audit fails, the service restores the pre-change snapshot rather than leaving an untracked configuration change.

The recovery endpoints list snapshots by allowlisted configuration key and restore only a listed snapshot identifier. Rollback checks the current revision to prevent overwriting concurrent edits, validates the snapshot as a governed document, snapshots the current file before restoring, and records requested/completed audit events. Snapshot identifiers—not caller-supplied filesystem paths—are accepted. God Mode UI exposes the recovery list, requires a reason, and asks for explicit confirmation before rollback.

## God Mode governed JSON editing (2026-10-11)

God Mode exposes a strict file editor for the registered provider, runtime, policy, evaluation inventories and module contracts. The editor uses only the canonical registry linked-file maps; rejects arbitrary paths, non-JSON files, oversized documents and secret-bearing field names; requires a current SHA-256 revision and a change reason; snapshots exact pre-change bytes under .cto-backup/ai-registry-snapshots; atomically replaces the file; and reloads the full control plane before accepting the change. A failed reload restores the previous bytes. The controller requires the immutable God Mode identity, writes a change-request audit event before mutation, and records completion afterward. If completion audit fails, it attempts automatic snapshot recovery. This is a file-backed configuration operation, not a database write, and it does not enable any AI provider by itself.


## Verification checkpoint — 2026-10-11

- The focused `AiRegistryService` Jest suite passed: 1 suite, 19 tests.
- The suite verifies canonical registry loading, the God Mode control-plane inventory, revision-token allowlisting, stale-revision rejection, invalid-document rejection without source mutation, save/rollback round-tripping, snapshot path-traversal rejection, symlink-target rejection, honest static diagnostics, module/capability checks, context-field restrictions, and forbidden canonical database writes.
- Backend production build (`npm run build`) completed with exit code 0.
- Frontend production build (`npm run build`, TypeScript plus Vite) completed with exit code 0; Vite transformed 2,325 modules.
- These checks validate compilation and the focused AI registry suite only. They do not establish that all application routes, live provider credentials, or production runtime integrations are healthy.
- Continue with end-to-end verification of the AI control-plane endpoints and UI, then wire shared provider/runtime/policy selection through the canonical registry. Keep module-specific contracts centrally stored and governed; avoid duplicate module-owned provider configuration. Preserve current working-tree changes and database contents.


## Canonical provider readiness gate — 2026-10-11

The shared backend `AiService` now derives speech-to-text readiness from the canonical provider inventory instead of reporting the injected provider as enabled unconditionally. A provider must match the registered provider ID and `SPEECH_TO_TEXT` capability and have status `PRODUCTION_READY`; otherwise status reports it disabled and transcription fails closed before provider execution. This keeps placeholder implementations from being presented as operational and preserves the no-cloud-fallback and no-direct-database-write defaults. Focused AI tests passed (23 tests across the service and registry suites). At the time of this checkpoint, the build appeared blocked. A subsequent rerun completed successfully with exit code 0 after approximately 106 seconds. The delay remains an environment performance concern, not a confirmed compile failure.
## AI platform verification checkpoint — 11 October 2026

- AI-focused backend tests: 31 tests passed across 3 suites (src/ai).
- Backend production compilation: npm run build completed successfully (exit code 0); duration was about 106 seconds.
- Context isolation: module contract contextReferences is the sole allowlist for each requesting module; globally registered conversation references do not grant cross-module access. Context projection uses the same module-scoped allowlist.
- Safety invariants retained: authorization precedes context projection; direct AI database writes remain disabled; candidate changes require validation and user confirmation; provider readiness is gated by the canonical provider inventory.

## AI Governance Enforcement Checkpoint — 2026-10-11

- AI-generated assistant messages must carry the provenance fields required by the central registry.
- Assistant-level provider, model, and version metadata must agree with the supplied provenance; supplied language metadata must agree as well.
- Ordinary user-authored messages do not require AI provenance.
- AI-proposed fact candidates must carry valid provenance, including a parseable generation timestamp.
- Candidate creation cannot bypass the confirmation workflow by starting in `CONFIRMED` or `APPLIED` status.
- Candidate confirmation cannot be disabled by an individual request; the central policy must require user confirmation.
- These checks are enforced in the conversation service and covered by focused automated tests.
- Verification checkpoint: 42 AI tests passed across 4 suites; backend build passed; `git diff --check` passed.
- This checkpoint does not claim production deployment or end-to-end runtime verification.
