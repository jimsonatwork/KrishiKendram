# KrishiKendram AI Execution Architecture

Status: Proposed implementation contract, 2026-10-14
Scope: Product AI runtime, module integrations, latency, isolation, provider portability.

## Executive decision

Use a **central AI control plane with plug-in capability adapters and isolated execution workers**. Decentralize computation, not authority.

- The NestJS backend remains the only authority for identity, authorization, canonical validation, durable state changes, transactions, idempotency, and audit.
- AI providers produce answers, classifications, extraction results, and action proposals. They do not receive database credentials and cannot write business records.
- Every module opts into AI through a versioned capability contract. A module that does not enable a capability continues to work normally.
- Keep Ollama as the current local inference runtime. Add a provider adapter only when it provides a capability or a measured improvement.
- PostgreSQL remains the source of truth. Do not add SQLite or Redis merely to appear distributed.

## Logical topology

1. Frontend interaction layer: React state, cached read-only display data, input hints, progress, cancel controls, and streaming rendering. No trusted authorization decisions.
2. Backend control plane: authentication, authorization-before-context, registry validation, intent routing, rate limits, task lifecycle, canonical services, audit, and persistence.
3. AI execution gateway: stable provider-neutral interface, capability-specific policy, provider health, model routing, request budgets, bounded concurrency, timeout and cancellation.
4. Runtime adapters: Ollama now; optional llama.cpp/OpenAI-compatible local servers, speech-to-text, text-to-speech, vision, embeddings, or approved remote providers later. Each adapter is independently registered and health-checked.
5. Data plane: PostgreSQL for business state, conversations, audit, durable tasks, and full-text knowledge retrieval. Optional disposable local cache only after profiling establishes a concrete requirement.

The current Ollama runtime is already a separate OS process. First isolate its request scheduling, budgets, and failure behavior; do not add another daemon without evidence.

## Stable module plug-in contract

Each module declares, in the central module registry:
- module ID and contract version;
- permitted capabilities (conversation, extraction, classification, vision, recommendation, etc.);
- context intent IDs and allowed fields;
- input/output schema versions;
- roles/capabilities required before context retrieval and again before action execution;
- whether output is read-only, a draft, or a proposed action;
- validation, confirmation, provenance, audit, timeout and fallback policies.

Modules consume a stable backend capability API rather than importing an Ollama SDK or model-specific implementation. The API should return a typed envelope containing status, result, provider/model provenance, timestamps, evidence references, validation requirements, and task ID where asynchronous. Unsupported capabilities return a typed unavailable result; they must not crash module initialization.

Provider changes are control-plane changes. A provider cannot be linked to a capability until health, schema compatibility, policy, and evaluation checks pass. Evaluation candidates must never change the live provider. Promotion requires recorded evidence and authorized approval. Unlinking must not delete model artifacts, conversations, or task history.

## Request execution policy

1. Authenticate the user.
2. Resolve a registry-approved intent.
3. Authorize before retrieving private context.
4. Prefer deterministic module services for exact record lookup and simple calculations.
5. For generative work, create a bounded request envelope and submit it to the AI gateway.
6. Apply provider allowlist, context/token budget, timeout, concurrency and cancellation policies.
7. Treat generated tool calls as untrusted proposals. Validate arguments and capability; invoke only existing module services.
8. Re-authorize at action execution time, run canonical validation, require explicit confirmation for mutations, apply idempotency/conflict checks, commit transaction, and audit.
9. Persist outcome and provenance; return a typed result. Never claim a task succeeded before its durable operation commits.

## Latency and resource controls

Measure separately:
- frontend send-to-acknowledgement;
- intent resolution;
- authorization/context lookup;
- queue wait;
- runtime/model load;
- time to first token;
- prompt evaluation;
- generation duration and tokens/second;
- persistence and end-to-end latency;
- peak RSS, CPU, errors, timeouts, cancellations, and answer quality.

Implement in this order:
1. deterministic-first routing for common known intents;
2. bounded prompt/history/context/output budgets and warm model;
3. streaming responses with persistence/error semantics and disconnect cancellation;
4. one active local inference job initially, with a small bounded queue and explicit overload response;
5. independent worker process/service supervision, health and restart behavior where it materially improves fault isolation;
6. compare models/runtimes using identical prompts, quantization, context and settings before switching.

On the current low-resource host, do not run several models or speech recognition concurrently by default. Queue or defer heavy jobs; keep critical backend operations independent of inference.

## Storage decision: PostgreSQL vs SQLite vs queue

- PostgreSQL remains authoritative for business data, permissions, audit, conversations, durable task state, and source-attributed knowledge. Reuse existing infrastructure.
- SQLite is acceptable only for a clearly bounded, disposable local cache or isolated worker checkpoint. It must not duplicate authoritative state or store uncoordinated business writes. SQLite writes are serialized; it is not a general multi-writer scaling layer.
- Begin with PostgreSQL-backed durable task state and one bounded in-process dispatch mechanism if needed. Add a dedicated broker only when measurements show queue throughput/retry isolation needs it.
- Redis/BullMQ is an optional later technology for distributed workers, delayed retries and scheduling, not a default dependency.
- PostgreSQL full-text search is the first retrieval step. Consider pgvector in the existing PostgreSQL service only after extension compatibility and evaluation; avoid a separate vector database initially.

## Plug-and-play technology matrix

- Local text generation: Ollama adapter first; llama.cpp adapter only after same-model benchmark shows material benefit.
- Provider API portability: a provider-neutral internal contract; OpenAI-compatible endpoints are an adapter protocol, not a trust boundary.
- Speech recognition: browser speech where suitable; later benchmark whisper.cpp and sherpa-onnx for offline Indic languages and CPU cost.
- Knowledge retrieval: PostgreSQL full-text first; optional pgvector within PostgreSQL.
- Durable background work: PostgreSQL task records and bounded execution initially; optional Redis/BullMQ if warranted.
- Development coding agent: OpenCode can be evaluated as a developer tool against local Ollama, but it is not a production runtime dependency and must not receive production credentials or unrestricted deployment permissions.

## Reliability and security invariants

- Cloud fallback stays disabled unless separately reviewed, explicitly enabled, and consent/policy requirements are met.
- Private context is retrieved only after authorization and is minimized per module intent.
- No provider receives database credentials; no direct AI database writes.
- All provider/model output is untrusted. Validate schema, size, content and tool arguments.
- Every mutation is re-authorized and executed through existing domain services, canonical validation and audit.
- Provider failure, timeout, queue saturation, cancellation, malformed output or unsupported capability must degrade the AI feature, not the host module.
- Use bounded retries only for idempotent operations; never blindly retry a mutation.
- Keep provider health, live model, evaluation model and production approval as separate states.
- Protect model and connection settings through God Mode and audit; never expose secrets to the frontend.
- Feature flags and contract versions permit rollback without schema-destructive migration.

## Rollout and acceptance gates

Phase 1: document contracts, inspect existing registry and baseline timing; no database migration.
Phase 2: provider-neutral gateway and typed capability results, with contract tests and current Ollama adapter parity.
Phase 3: bounded inference scheduling, timeout/cancel handling, observable timing, and graceful overload response.
Phase 4: streaming end-to-end after persistence, reconnect, error and disconnect tests.
Phase 5: module opt-in integration one capability at a time; test disabled-provider behavior and role boundaries.
Phase 6: evaluate candidate runtimes, smaller models, retrieval and offline speech; promote only with benchmark and security evidence.

Do not declare a phase complete until backend tests, frontend build, health checks, authorized/unauthorized tests, module regression tests, and rollback verification pass. No destructive DB changes are included in this plan.

## 2026-10-14 — Task-aware multi-model routing foundation

### Decision
KrishiKendram uses one governed AI gateway with task-aware, interchangeable provider adapters. Routing hints classify computational shape only; they never grant data access or tool permissions. The deterministic application path remains first for known operations.

### Implemented in this batch
- Added TextGenerationTask values for general conversation, structured extraction and advanced reasoning.
- Added an injectable provider pool and optional adapter task capability/priority contracts.
- Provider candidates are filtered against the canonical provider inventory before task priority is considered. Unregistered candidates and non-local providers are rejected by this execution path.
- Cloud fallback remains disabled. Provider/model priority is not an authorization decision.
- Added deterministic task classification and regression tests.
- Added a monotonically increasing VoiceAgent turn epoch so interrupted requests cannot publish stale late answers.

### Acceptance status and limits
- Verification after the voice-intake and shared-vocabulary changes: AI + intake regression gate passed 15 suites / 140 tests; backend build and frontend TypeScript/Vite production build passed on 2026-10-14.
- Multiple production-approved inference models are not yet verified. The current inventory contains an evaluation-only local Ollama adapter and a disabled provider; do not claim a production multi-model fleet until additional adapters are installed, registered, approved and benchmarked.
- Historical checkpoint: a short local Ollama health probe timed out on 2026-10-14; runtime reachability was subsequently verified on 2026-10-17 at the versioned API health route and local Ollama API.
- Backend build and frontend build both passed after the shared-vocabulary and voice-intake changes; rerun both after subsequent source changes.
- Farm listing remains deterministic and owner-scoped. Guided voice-to-crop intake now creates an ephemeral draft, resolves an authorized farm, previews crop/area/defaults, accepts crop/area/farm corrections, and only calls the authorized intake service after explicit confirmation. The backend returns the created crop ID from the same transaction as the farm history record.
- Crop aliases, planting verbs, area units and spoken number words now have one canonical source in backend/src/ai/registry/crop-terminology.ts, linked from the platform registry and served through the authenticated voice-intent manifest. The browser no longer maintains a second crop catalogue.
- Remaining acceptance: test the complete voice flow in an authenticated browser with one farm and multiple farms, confirm cancel/correction behavior, and verify the created crop and history record against the database.

### Next gates
1. Run the authenticated browser acceptance test for the voice-to-crop workflow without disrupting active application services.
2. Add provider contract tests for each new adapter and ensure task priority never bypasses registry authorization.
3. Benchmark installed local model candidates under the host's resource limits before approving concurrent inference.
4. Extend the guided workflow to other module-owned create/update actions only after the crop vertical slice passes browser verification.
5. Add governed outcome/correction capture and regression publication; no raw-conversation training or automatic permission changes.

## 2026-10-14 — External agent and web toolchain review

- Added docs/AI-TOOLCHAIN-ADOPTION-REVIEW.md to record the decision and security boundaries; the canonical AI platform registry now links this review as toolchainAdoptionReview (registry version 4) for Hermes Agent, OpenMuse, OpenChamber, OpenCharm, OpenHands, Snyk DeepCode AI, Playwright and axe-core.
- Decision: keep the farmer-facing runtime on the existing governed AI registry and module services. Adopt Hermes-style approved skill evolution, OpenMuse-style visible task outcomes as a future supervised workspace pattern, OpenChamber-style isolated multi-model development runs, and Playwright/axe-core as release tooling. Do not embed a second agent runtime or grant external agents direct DB authority.
- The installed local Ollama runtime reports Qwen3 1.7B and Qwen3.5 0.8B. Qwen3.5 remains an unlinked evaluation candidate. Benchmarking must run only in a maintenance window because the benchmark intentionally unloads and reloads the live local model; it must not be run against an active farmer workload.
- Snyk DeepCode AI remains an optional security-review integration pending data-disclosure, licensing, cost and CI integration review. The public deepcode_ai_fix repository is archived and is not treated as the complete maintained product.
- Playwright + axe-core are being added as development-only dependencies for mock-backed browser acceptance tests. These tests do not replace an authenticated test-environment run or DB persistence verification.


## 2026-10-16 — Intake bilingual contract and verified regression

Intake validates and stores the original transcript/language and reviewed English meaning with confirmation and provenance in FarmRecord.data.intakeMetadata; the existing authorized service boundary and transaction remain authoritative. The backend rejects non-English submissions lacking a confirmed English meaning before extraction. Frontend production build passed; Intake/Livestock/Marketplace focused regression passed 32 tests across 3 suites; /api/v1/health returned HTTP 200. Automatic translation and confidence/deviation-based clarification are still not implemented and must not be described as complete. See docs/AI-INTAKE-MULTILINGUAL-CONTRACT.md.


## 2026-10-16 — Operational UI workflow follow-through

Livestock edit, ownership-history and archived restore paths are exposed in the frontend and backed by the authenticated controller/service; marketplace creation uses resource choices from the user's accessible data instead of a manually typed internal ID. Verification: backend build PASS, focused Intake/Livestock/Marketplace tests 33/33 PASS, frontend build PASS, API/UI health HTTP 200, git diff --check PASS. Seller/buyer acceptance and real authenticated browser checks remain open.


## 2026-10-17 — Ollama native-store and live-provider verification

The managed local Ollama runtime is version 0.40.3 and is reachable at 127.0.0.1:11434 with cloud disabled. The runtime launcher now defaults to the native WSL model store at /home/jj/.local/share/krishikendram/ollama-models, while preserving the KK_AI_OLLAMA_MODELS_DIR override. The original D: model store remains intact as a recovery copy. The copied store contains all three installed Qwen models, and all three model manifests match the source SHA-256 hashes.

Live provider smoke test passed through OllamaTextGenerationProvider using qwen3:1.7b and its recorded digest. A warm synthetic request returned OK in 1.83 seconds, with 0.011 seconds model load, 1.647 seconds prompt evaluation, and 0.133 seconds generation. A separate cold load still took about 45.93 seconds; cold-start latency remains open. The response remains a proposal requiring canonical validation and user confirmation.

The current active model remains qwen3:1.7b. Qwen3.5 0.8B remains selected for evaluation and Qwen3.5 2B remains a linked installed candidate; neither is production-approved. The read-only preflight found eight benchmark cases and no blockers, but the full benchmark was not run because it intentionally unloads/reloads the model and is gated to a maintenance window. No cloud fallback, production promotion, database mutation, or Docker volume change occurred.

Verification: Ollama model inventory returned all three models; API health at /api/v1/health and UI health at port 4000 returned HTTP 200; focused provider/registry/text-generation tests passed 3 suites and 21 tests; shell syntax and git diff checks passed. Mocked Voice Agent E2E passed 12 of 12 tests; authenticated live-browser acceptance, multilingual translation/confidence handling, and candidate benchmark remain outstanding.


## 2026-10-17 - Local Intake translation implementation (2026-10-17T17:37:28+05:30)
- Added authenticated local Intake translation via the governed TextGenerationService; no cloud fallback and no direct database write.
- Output confidence is explicitly uncalibrated. A 0.85 review threshold, visible-number check, multilingual acre/hectare check, and planting-action preservation check flag likely material drift; detected drift caps confidence at 0.5. Explicit user review and confirmation remain mandatory.
- Focused tests pass: 3 suites / 19 tests; backend and frontend builds pass; mocked translation UI E2E passes 1/1. Route is registered; unauthenticated POST returns 401. Authenticated live-backend browser acceptance remains open.
- Live Telugu smoke demonstrated remaining model-quality limitations: it returned 'I have 2 acres of rice' and omitted the planting action. The action guard caught it. A warm request took about 15 seconds; a later request under startup/model contention took about 87 seconds.
- Model remains evaluation-only. Do not promote based on this smoke. Multilingual quality benchmarks and authenticated browser acceptance remain open.


## 2026-10-17 - Cross-module regression sweep (2026-10-17T17:42:55+05:30)
- Cross-module regression sweep passed: 7 suites / 57 tests across Intake, Livestock, Marketplace, Ollama provider and AI model-link registry. Backend and frontend builds pass; mocked Intake translation UI E2E passes 1/1.
- Local translation still requires human review: a live Telugu smoke omitted the planting action, which the new guard caught. Model remains evaluation-only; language quality, cold latency and authenticated browser acceptance remain open.
