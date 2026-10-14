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
- Verification: full AI regression gate passed 13 suites / 125 tests; the focused gate covers 6 suites / 67 tests. Backend build and frontend TypeScript/Vite production build passed on 2026-10-14.
- Multiple production-approved inference models are not yet verified. The current inventory contains an evaluation-only local Ollama adapter and a disabled provider; do not claim a production multi-model fleet until additional adapters are installed, registered, approved and benchmarked.
- A short local Ollama health probe timed out; runtime reachability is not confirmed by this probe.
- Backend build and frontend build must pass before this batch is considered verified.
- Farm listing remains deterministic and owner-scoped. A complete voice-to-crop-creation workflow, with required-field collection, preview, confirmation and module-service persistence, remains a separate acceptance gate.

### Next gates
1. Complete backend build and frontend build without disrupting active application services.
2. Add provider contract tests for each new adapter and ensure task priority never bypasses registry authorization.
3. Benchmark installed local model candidates under the host's resource limits before approving concurrent inference.
4. Complete a module-owned multi-field create workflow and test actual persisted results.
5. Add governed outcome/correction capture and regression publication; no raw-conversation training or automatic permission changes.
