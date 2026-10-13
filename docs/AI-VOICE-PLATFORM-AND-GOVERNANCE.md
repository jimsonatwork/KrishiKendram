# KrishiKendram AI Voice Platform and Governance Baseline

Status: Phase 1 implementation started — shared voice navigation UI only. This document distinguishes implemented behavior from planned capabilities.

## Design goals
- Voice is an optional, shared interface across authenticated application screens, not a separate silo.
- Reuse local AI assets first; avoid duplicate large model downloads and avoid paid API dependence by default.
- Providers are replaceable behind stable contracts: ASR (speech-to-text), LLM/planner, translation, TTS (text-to-speech), VAD/turn detection, and optional vision/OCR.
- Local/offline processing is preferred where practical and accurate. Hosted providers are opt-in, explicitly configured, budget-limited, and disabled by default until approved.
- Never allow a model to write to PostgreSQL, change policy, or elevate privileges directly.

## Initial model/technology shortlist
| Capability | Candidate | Use and constraints |
|---|---|---|
| Indic ASR | Existing AI4Bharat IndicConformer 600M multilingual assets | First local candidate; current NestJS provider is still a placeholder until inference bridge is safely integrated and tested. Confirm actual assets, dependencies, latency, and accuracy before enabling. |
| Indic ASR fallback | AI4Bharat monolingual IndicConformer variants | Evaluate per-language if multilingual model accuracy is insufficient. Do not download all variants before benchmark. |
| General ASR baseline | Whisper/faster-whisper family | Benchmark for code-switching, English product terms, noise, memory, and license/model terms. Do not assume it beats IndicConformer on every Indian language. |
| Translation | IndicTrans2 | Optional translation layer for user language, app labels, and knowledge content; verify the chosen checkpoint's license and hosting requirements. |
| Indic TTS | AI4Bharat Indic-TTS | Evaluate supported languages and voices; verify each model asset license and inference dependencies. |
| Newer Indic TTS | AI4Bharat IndicF5 | Benchmark naturalness, runtime and model license; voice cloning/reference audio must require explicit consent and must not imitate another person without authorization. |
| Turn detection | Browser VAD initially; evaluate Silero VAD or WebRTC VAD for server streaming | Local CPU-friendly option; handle false triggers and background farm noise. |
| Realtime transport | WebSocket first for internal API; WebRTC only if latency/duplex tests justify the operational complexity | Authenticate every session, enforce quotas, redact sensitive logs, and close streams on logout/timeout. |
| Local reasoning model | Evaluate a small instruction-tuned model through a supported local runtime only after hardware/latency inventory | No model is selected yet; compare memory footprint, tool-call reliability, multilingual quality, license, and prompt-injection resistance. |
| Hosted reasoning/speech | Optional provider adapters | Disabled by default; God Mode must configure provider, secrets reference, allowed data classes, region, monthly cap, rate limits, timeout, and fallback policy. |

Licenses are artifact-specific. Validate code, model weights, tokenizer, datasets, voice samples, and dependency licenses separately before production use. Do not treat an open-source repository label as blanket permission for every hosted or commercial use.

## God Mode governance requirements
All settings below must be governed centrally by God Mode, versioned, audited, and validated on the backend. UI controls alone are not security controls.

### Provider/model registry
- Provider/model entries: ID, capability, version/revision/hash, license evidence, source URL, supported languages, runtime, device requirements, local/cloud mode, enabled/disabled, rollout status, timeout, concurrency, rate limit, cost estimate, budget ceiling, data residency, and fallback order.
- Secret values must never be rendered back to the UI or stored in plain configuration; use secret references and redacted status.
- Disable any provider with an expired license review, failed health check, budget breach, or critical security finding.
- Model downloads/updates require integrity checks, allowlisted source, disk-space preflight, checksum, rollback version, and explicit approval.

### Permission and action policy
- Authenticate and authorize the user before any private context is retrieved or sent to a model.
- Every tool call executes as the current user, with least privilege and downstream server-side permission checks. The model never determines its own permission.
- Classify actions: read-only; reversible draft; low-risk write; sensitive write; financial/legal/approval action; destructive or security-critical action.
- Read-only navigation may run immediately. Drafts require preview. Writes require explicit user confirmation and server-side validation. High-impact actions require step-up authentication and/or authorized human approval according to policy. Deletion, role/permission changes, credential rotation, policy edits, and God Mode actions must never be performed on an ambiguous voice command.
- Voice is not an authentication factor by itself. Do not accept a spoken name or voice match as sufficient authorization.
- No direct database access, arbitrary SQL, shell execution, unrestricted URL fetch, hidden tool discovery, or model-controlled policy mutation.
- Require idempotency keys, bounded tool calls, rate limits, timeouts, replay protection, audit records, and rollback/compensation plans for mutating workflows.

### Validation, approvals, audit and privacy
- All generated values are untrusted suggestions and must pass the central Field Policy/Registry validation.
- Preserve attribution: user, AI provider/model version, source transcript, proposed action, validation outcome, confirmation event, approver, execution result, and rollback reference. Redact credentials, tokens, private audio, and unnecessary personal data.
- Provide opt-in microphone access, visible recording state, stop/mute, language selection, transcript review, deletion/retention policy, and a non-voice alternative.
- Ask consent before cloud audio or transcript processing. Minimize retained audio; default to not retaining raw audio unless a documented purpose and retention rule are approved.
- Support user corrections, uncertainty prompts, confidence thresholds, and escalation to typed input/human help.
- Prompt injection from transcripts, documents, photos, and web content is untrusted input, not instructions. Tool execution must be allowlisted and validated independently.
- Maintain model/provider change history, evaluation results, policy snapshots, and rollback.

### Operational policy
- Global defaults plus module/action-specific overrides, with explicit inheritance and conflict resolution.
- God Mode controls enablement, language availability, provider priority, data classification, consent, retention, confirmation level, allowed tools, per-user/role limits, cost ceilings, and emergency kill switch.
- Configuration changes take effect only after validation; high-risk changes require a second authorized approver where configured.
- Track latency, transcription error/correction rate, task completion, refusal/confirmation outcomes, crashes, resource use, provider cost, and per-language quality.
- Roll out by language and role with canary testing; automatic fallback must not weaken authorization or move sensitive data to an unapproved provider.

## Delivery phases
1. **Phase 1 (implemented UI slice):** shared authenticated Voice Agent panel, microphone opt-in, selectable Indian languages, speech output, typed fallback, safe route navigation, role-aware navigation list, no record writes.
2. **Phase 2:** backend voice-session API, auth-aware context retrieval, transcript/intent contracts, provider health status, real ASR bridge with file-size/type/duration validation, quotas and audit.
3. **Phase 3:** local TTS and turn detection; streaming/interruptions; model benchmarks using consented multilingual samples and existing test recordings.
4. **Phase 4:** registry-backed action tools with server-side authorization, central validation, preview/confirmation, approvals, idempotency, audit and rollback.
5. **Phase 5:** expand module-by-module; accessibility, mixed-language commands, noisy-field testing, offline/low-connectivity fallback, production threat model and load/cost tests.

## Current known limitations
- The existing NestJS IndicConformer provider is registered but returns a service-unavailable placeholder; transcription is not yet functional.
- This Phase 1 UI uses the browser SpeechRecognition/SpeechSynthesis APIs where available. Browser speech recognition may use a browser vendor service; it is not guaranteed to be on-device or offline.
- The UI currently supports navigation and help only. It does not create/edit records, change God Mode policy, or call a model backend.
- No LLM, TTS, or ASR provider should be described as production-ready until integration, license review, per-language benchmarks, and security tests pass.

## Central AI inventory and configuration contract (required God Mode implementation)

There must be one canonical AI control plane, exposed in God Mode and enforced by backend services. Do not create per-page or per-provider configuration copies. The existing backend God Mode configuration registry is the control source; AI-specific registry records and schemas must be added there through versioned migrations/seeds, with a documented owner and lifecycle.

Every AI provider, model, runtime, connector, dataset and tool needs a registry record with:
- Stable ID, display name, capability/purpose, intended user/role, expected outcome, owner/team, vendor/company/project name, official source/repository/documentation URL, support/maintenance status, license and license-review date.
- Model/provider version, pinned revision/hash, supported languages/modalities, benchmark results by language and device class, known limitations, safety notes, release status, and replacement/retirement plan.
- Installation status, package/runtime/module name and version, exact resolved path, configured path source, environment variable/config key name, install method, hardware/runtime dependencies, disk/RAM/CPU/GPU requirements, last health check, logs/diagnostics reference, and whether the component is local or hosted.
- Configurable non-secret variables: endpoint, timeout, concurrency, request/audio size limits, sampling/decoding options, confidence thresholds, VAD/turn-taking, retry/fallback order, allowed regions, retention, cache, feature flags and performance mode. Secret values are never returned to clients; store secret-manager/environment references only.
- Cost model (free/local, per minute/token/request, infrastructure cost), per-role/per-user quotas, monthly and daily budget ceilings, alert threshold, hard-stop behavior, estimated scale capacity, scaling trigger, queue/backpressure policy, and expected cost per completed workflow.
- Data classification, consent requirement, allowed data fields, cloud/local routing policy, retention/deletion policy, allowed tools/actions, risk level, confirmation policy, required approver, audit policy, and emergency disable switch.
- Snapshot/version, creator/updater, approval and review trail, last verified date, rollout percentage, rollback target, deprecation date and change reason.

God Mode should present this as searchable, filterable sections: **Inventory & Sources; Installed Paths & Runtime; Models & Capabilities; Languages & Quality; Provider Connections; Variables & Secrets References; Cost & Scale; Data & Consent; Authorization & Actions; Policies & Approvals; Health & Diagnostics; Audit & Rollback**. Support global defaults with explicit per-capability and per-module overrides; show inherited vs overridden values. Validate every change, take a snapshot, record actor/reason, and require configured second-person approval for critical changes. Do not make a path editable and then blindly execute it: restrict path roots, verify file ownership/permissions and checksums, and run provider processes with least privilege.

## Voice conversation and subtitle experience

The shared Voice Agent should provide a responsive, accessible live conversation panel on desktop, tablet and mobile. Show both user speech/transcription and agent replies as readable subtitles; retain the current session transcript while navigating application pages; keep a compact latest-caption strip when the panel is minimized; expose mute, stop, language, font/contrast and transcript-clear controls. Voice and text are equivalent input channels: the user can correct recognized text, type instead of speaking, or continue without audio output. Avoid automatic microphone activation.

Conversation-driven form completion must use a workflow state machine, not a free-form model write:
1. Resolve the active screen and the current user's authorized capabilities.
2. Ask for fields one at a time or in natural batches; display each recognized answer as a draft beside the relevant form fields.
3. Mark uncertain/invalid/missing values, read back important values, and run the central Field Registry validation.
4. Let the user edit the transcript or individual values; never overwrite existing saved data silently.
5. Summarize the proposed changes and obtain explicit confirmation before submission.
6. Submit through the existing module API as the authenticated user; backend repeats authorization, validation and approval checks.
7. Show a visible success/failure result and speak it when audio is enabled. Audit the proposed action, confirmation, validation and outcome without storing raw audio by default.

For multi-device support, design session and transcript APIs around authenticated server-side sessions with device/session IDs, sequence numbers, expiry, and safe reconnect/resume. Do not sync microphone streams by default. Store only the minimum transcript/session data required by an approved retention policy, isolate tenants/users, and support revocation/logout. The current Phase 1 transcript list is client-local UI state only; cross-device persistence, real backend ASR, form filling, and God Mode AI controls are future implementation tasks, not yet complete.


## 2026-10-11 — implementation checkpoint

The shared VoiceAgent UI is mounted in the application shell with a transcript/subtitle view and typed fallback. God Mode now also renders the read-only AI control-plane inventory from the authenticated canonical endpoint. Both frontend production build and backend build pass, and the focused AI registry suite passes 12/12. The voice widget still does not write records, invoke a production ASR model, persist conversation sessions across devices, or submit form drafts; those capabilities remain gated on the governed workflow implementation.

## Conversation Provenance and Confirmation Gate — 2026-10-11

### Required behavior

1. AI-generated assistant messages must include all provenance fields required by the central AI registry.
2. Provider/model/version metadata must be consistent between the message and its provenance.
3. Generation timestamps must be valid date strings.
4. Ordinary user messages remain valid without AI provenance.
5. Proposed fact candidates must include provenance and remain inside the permitted initial-status workflow.
6. Candidate creation must not directly confirm or apply a proposed fact.
7. User confirmation remains mandatory under central policy; callers cannot opt out by passing `requiresConfirmation: false`.

### Verification

The AI test suites passed 42 tests across 4 suites, and the backend build and whitespace validation passed on 2026-10-11. These are code-level checks, not proof of production deployment.

## 2026-10-13 — Voice-first, no-learning-curve Agri-OS plan (merged requirement)

### Product outcome
KrishiKendram must be manageable through ordinary conversation for users who may not know module names, form structure, or technical terminology. A user should be able to speak naturally in their preferred supported Indian language, including code-mixing, describe a farm/task over several turns, correct earlier answers, and have the agent ask only for missing or conflicting details. The UI shows understood words and draft field values in the active module, then explains and confirms the proposed change in the same language before applying it through the normal module API. This enhances the existing PMD/Bible principles; it does not bypass centralized field policy, authorization, audit, or confirmation.

### Canonical conversation-to-task pipeline
1. Microphone is opt-in; show language, listening state, transcript, actual provider mode, stop/mute and typed alternative. Never claim offline/local handling unless verified.
2. ASR returns transcript and language metadata. Preserve original text; normalization/translation is a linked derivative with provenance, never a silent replacement.
3. Resolve intent using active screen/entity plus the server-authorized module capability manifest. Browser phrase matching is navigation help only, not the final router.
4. Keep per-user/per-conversation draft state. Map answers to the central field registry; track known, missing, uncertain, invalid, conflicting and corrected values. Ask short follow-up questions for the next required field; never invent a required value.
5. Validate through central Field Policy/Registry. Display draft beside the correct form; never silently overwrite saved data.
6. Read back the exact target and proposed changes in the user's language. Require explicit confirmation before applying changes, submissions, publishing, approvals, permission changes or high-impact operations.
7. Invoke only allowlisted server-side handlers under the signed-in actor; backend repeats role, ownership, field and business-policy checks. No model SQL, direct database writes, arbitrary code or model-controlled policy changes.
8. Audit provider/model versions, language, source message IDs, extracted field references, validation, confirmation, action result and rollback reference. Minimize audio/transcript retention; no raw conversation training by default.
9. Report what succeeded/failed and remaining work; keep visible subtitles and a typed/manual path.

### Role and authorization alignment
The current VoiceAgent has a frontend SUPER_ADMIN branch and hard-coded FARM/ADMIN phrase-to-route arrays. Treat these as Phase 1 navigation helpers only, not final role policy. The next implementation must consume a backend-authorized capability manifest and stable registered intent IDs. All roles see only permitted tasks; God Mode actions require separate server authorization and high-risk confirmation. Voice, accent, phrase match or speaker identity never grants permission.

### Open-source/free-only support stack
The observed host is Intel i3-5005U (2 cores/4 threads), about 12 GiB RAM, Intel HD Graphics 5500, about 5.7 GiB WSL-visible memory and about 95.6 GiB free on D:. Prefer CPU-first small components and defer heavyweight NeMo/PyTorch installation until measured need and capacity justify it.

- Local LLM: Ollama plus a small quantized model is an evaluation candidate only; not installed, no model downloaded, and no production readiness implied.
- ASR baseline: whisper.cpp with a quantized multilingual tiny/base model; measure Telugu, code-mixing, noisy farm speech, names, numbers, WER/CER, latency and RAM.
- Indic ASR comparison: AI4Bharat IndicConformerASR; defer heavy NeMo/PyTorch setup until a resource test supports it.
- Indic TTS: evaluate AI4Bharat Indic-TTS checkpoints for Telugu and other supported languages; verify exact checkpoint and dependency licenses. IndicF5 is deferred pending reference-audio and resource review.
- Translation: IndicTrans2 is optional, not a mandatory hop; model checkpoints are MIT while some dataset artifacts have separate attribution terms.
- Browser Web Speech API is a progressive fallback only; browser/provider may handle recognition remotely and support varies.
- FFmpeg is not installed by this plan; use only if the chosen audio contract needs it, and record exact build/license.

The canonical license-aware inventory is ai/supporting-components.json linked from the root registry. Code, model/checkpoint, dataset, voice and dependency licenses are separate review items. No paid/credit-metered hosted API or implicit cloud fallback is allowed under the current requirement.

### Acceptance gates
- Official source, pinned version/revision, integrity checksum/signature, code/model/dataset/dependency licenses, notices and rollback.
- Cold/warm start, first-token/first-audio latency, real-time factor, peak RAM, CPU, disk, concurrency and impact on app/Postgres/Docker.
- Consented Telugu-first evaluation, then Hindi and additional languages; native-speaker review for dialects, accents, code-mixing, agricultural vocabulary, numbers/units and noisy audio.
- Multi-turn form completion for profile/onboarding, farms, crops/crop cycles, livestock, activities and marketplace, including corrections, missing-field prompts, conflict detection, validation, draft preview, confirmation, normal API submission and audit/rollback.
- Cross-role/cross-owner denial, prompt injection, allowlisted tools, confirmation bound to exact preview, rate limits, timeouts, idempotency, retention/deletion and accessibility.
- Only after all gates pass may a provider be explicitly approved/enabled. Installation or build success alone is not acceptance.

### Current status
Planned evaluation suites are recorded in ai/evaluations/evaluation-index.json; planned suites are not passing test results. No runtime/model was installed or downloaded in this checkpoint. The incomplete unverified Ollama installer from the preceding attempt was removed. Provider remains disabled and ASR remains a placeholder.


## Central voice intent manifest and cloud connection boundary (2026-10-13)

`ai/voice/voice-intents.json` is the single maintained source for navigation intent IDs, phrases, paths, owning AI module, and access class. The frontend retrieves the filtered manifest from `GET /api/v1/ai/conversations/voice-intents`; it no longer owns separate farmer/admin route phrase arrays. The endpoint verifies active account status and the canonical persisted God Mode identity before disclosing privileged intents. Restricted phrases are returned without privileged destinations so the agent can explain the boundary without guessing.

The manifest is discovery only. It does not replace route guards, `AuthorizationService`, field policy, ownership checks, or the confirmation workflow. Administrative AI intents are God-authorized; a `SUPER_ADMIN` role alone is not sufficient to expose the privileged voice routes.

The central `ai/connections/cloud-connection-policy.json` appears in the God Mode AI control plane as an intentionally disabled configuration slot. A candidate provider is listed as not implemented and not production-ready. No cloud calls, automatic fallback, or credential storage in JSON are enabled. Activation remains blocked until the cloud adapter and proposal/God-approval/consent/license/audit/rollback gates are implemented and tested.


## Conversation-to-module fact-draft pipeline (2026-10-13)

- Central conversations remain owned by `KK-AI-CONVERSATION-001`; a fact candidate may target a different registered module only when that module's canonical AI contract allows extraction and the target entity is listed in `candidateFactTargets`.
- `POST /api/v1/ai/conversations/:conversationId/fact-candidates` creates a draft proposal only. `GET /api/v1/ai/conversations/:conversationId/fact-candidates` lists proposals for the authenticated owner. Both routes remain under the JWT-protected conversation controller.
- Each proposal must cite an existing user-authored message from the same owned conversation. The service does not claim a model performed extraction; provenance explicitly records `providerId=conversation-draft-service`, `modelId/modelVersion=not-applicable`, `mode=DISABLED`, `source=USER_AUTHORED_EVIDENCE`, and `extractionModelUsed=false`.
- Entity eligibility comes from the central AI module contract. Field identity, normalization, and validation come from the existing platform `RegistryService` resource/field definitions and validation policy. The canonical `AuthorizationService.authorizeFields` path must approve resource CREATE (or UPDATE for the authenticated user's own profile) and field WRITE policy before a draft is saved.
- Proposals are created in `VALIDATION_PENDING`, carry `validationResult`, and always require explicit user confirmation. Invalid values remain visible as flagged proposals for correction; they are never applied. Existing-record targeting is rejected except for the authenticated user's own registered User profile fields, which require UPDATE authorization. Other existing-record changes need their dedicated authorized workflow.
- No database schema migration, direct AI domain write, model installation, cloud activation, or credential change is part of this increment. The remaining work is an explicit candidate review/confirmation state machine, audited apply through normal module APIs, and frontend draft-preview integration.


### Cross-registry target alignment (2026-10-13)
The AI module contracts now advertise only fact target model names present in `RESOURCE_DEFINITIONS`: User, Farm/FarmAsset/FarmRecord, Crop, Livestock, and MarketplaceListing. The internal AI conversation module has no farmer-fact targets. Module contracts were versioned to v2, and `ai-module-resource-cohesion.spec.ts` guards against future drift between the central AI registry and platform resource registry. Missing resource/field definitions fail closed rather than being guessed.


### Fact-draft review and explicit confirmation (2026-10-13)
- Draft list responses include a server-computed SHA-256 preview hash binding the candidate identity, module/entity/field target, proposed and previous values, confidence, evidence reference, provenance and validation result. Confirm/reject requests must return this hash; stale or tampered previews are rejected.
- Confirmation re-checks the current AI module contract, registered platform resource/field, user-authored evidence, resource-level CREATE/UPDATE permission and field WRITE policy. A compare-and-set status transition and audit event are committed in one Prisma transaction.
- Rejection uses the same preview binding and atomic status-plus-audit transition. Confirmation records `CONFIRMED` only; `applied=false` remains explicit because normal module API application is not implemented by this endpoint.
- The Voice Agent now has a saved-draft review panel that shows the target, proposed value, original user evidence, validation errors, and confirm/reject controls. It does not fabricate candidates when the approved extraction provider is unavailable.

Fact-draft creation is also atomic with `AI_FACT_DRAFT_CREATED` audit logging. If the audit service is unavailable, the transaction fails and no candidate is saved. Confirmation and rejection each commit their status transition with the corresponding audit event in one transaction.


## 2026-10-13 - Local Ollama provider adapter groundwork (PARTIAL)

The backend now contains an Ollama-compatible text-generation adapter behind the shared TextGenerationProvider contract. It restricts the configured endpoint to loopback or host.docker.internal, applies bounded input/history/output and timeout limits, records provider/model/version/language provenance, exposes a runtime/model health probe, rejects malformed responses, and never falls back to a cloud provider.

The user-space scripts scripts/kk-ai-runtime-start.sh and scripts/kk-ai-runtime-stop.sh manage the local Ollama process. It binds only to 127.0.0.1:11434. The binary install path is D:/KrishiKendram/08-AI/Tools/Ollama; model storage is configurable with KK_AI_OLLAMA_MODELS_DIR and defaults to /mnt/d/KrishiKendram/08-AI/KrishiKendram-AI/Models/Ollama. The backend example environment keeps KK_AI_ALLOW_LOCAL_EVALUATION=false by default.

Evaluation-only generation is permitted only when the canonical provider inventory explicitly says EVALUATION_ONLY, the provider is LOCAL, KK_AI_ALLOW_LOCAL_EVALUATION=true, and NODE_ENV is not production. Evaluation is not production readiness. No model response may write domain data; canonical validation, confirmation, normal module services and audit remain required.

Status at this checkpoint: the adapter unit tests and focused service/controller tests pass. The Docker image pull stalled and was stopped without touching application/database containers. The official user-space .tar.zst archive is downloading; the model has not yet been pulled or tested, so no real inference or production readiness is claimed. Provider/runtime inventories must not be marked EVALUATION_ONLY until the runtime and exact model digest are verified.


### Runtime verification checkpoint - 2026-10-13 16:49 IST

The official Ollama Linux archive was downloaded to D: and extracted successfully. Local archive SHA-256: CE6F8B671A699BF1EBAFB28D60DBBABF4F37B30B499145FA308A8BA72DE021D6. Runtime version 0.40.3 answers GET /api/tags with HTTP 200 on 127.0.0.1:11434. Model storage is on the D: AI root. The configured model pull is in progress; the model is not installed and no inference has been verified.

The first local startup used Ollama's default cloud setting and attempted only model-recommendation/cloud-cache metadata requests; no user conversation or farm context had been sent because no model was loaded and no generation was invoked. That process was stopped and restarted with OLLAMA_NO_CLOUD=true. The current runtime log confirms OLLAMA_NO_CLOUD=true and "Ollama cloud disabled: true". The backend provider remains EVALUATION_IN_PROGRESS and cannot generate until the model and checks are verified.


## 2026-10-13 — Local model evaluation checkpoint (not production approval)

- Ollama 0.40.3 is installed under the configured D: AI tools directory and is bound to loopback at 127.0.0.1:11434 with cloud features disabled.
- Qwen3 1.7B Q4_K_M is installed in the D: model directory. Observed Ollama model digest: 8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7. Runtime metadata and model presence are verified; a captured successful generation response and English/Telugu quality evaluation are still pending.
- The NestJS AI module now binds the text-generation token to the Ollama provider. The provider only accepts loopback/host.docker.internal HTTP endpoints, limits request/history/output sizes, times out bounded requests, returns provider/model provenance, and never falls back to cloud.
- Local evaluation is opt-in only: provider inventory must mark evaluationOnly and EVALUATION_IN_PROGRESS, cloud fallback must remain false, KK_AI_ALLOW_LOCAL_EVALUATION=true, and NODE_ENV must not be production. The default remains disabled. This is not a production-ready state.
- The authenticated conversation status endpoint exposes provider/model identity, canGenerate, runtime reachability, and whether the configured model is installed. Runtime health does not imply generation authorization.
- Verification on the development branch: 11 AI test suites / 100 tests passed; backend Nest build passed; git diff --check passed. No commit/push or A/B/C promotion has occurred.
- Next gate: capture real inference and latency, evaluate English and Telugu output against a synthetic non-sensitive test set, then complete a governed module workflow and its authorization/audit tests before any production-readiness change.


## 2026-10-13 — Governed fact-draft application slice
- Confirming a fact draft is not itself a domain write. A separate authenticated apply endpoint now supports only the authenticated user's own User profile, and only the allowlisted fields `name`, `mobile`, `preferredLanguage`, and `preferredInputMethod`.
- Application rechecks conversation ownership, user-authored evidence, exact preview hash, canonical AI module eligibility, resource/field authorization, and central validation. It compares the profile value captured at draft creation, locks the User row, and rejects stale proposals rather than overwriting later changes.
- The application uses `UsersService.update()` inside the same Prisma transaction as the fact-candidate APPLIED transition and AI application audit. The normal user history/audit logic remains authoritative; no generic direct-Prisma domain write is permitted.
- SUPER_ADMIN profile drafts fail closed unless a separate explicit God Mode authorization path is implemented. Ordinary SUPER_ADMIN role is not God authorization.
- Farm, Crop, Livestock and Marketplace candidates remain confirmed-but-unapplied until their own module-owned handlers can supply complete DTO/relationship context and re-run module authorization, validation, idempotency and audit rules. A single field must never be misrepresented as a complete new entity.
- Verification on this slice: focused tests 3 suites/43 tests passed; full AI suite 11 suites/103 tests passed; backend and frontend builds passed; `git diff --check` passed. The local Ollama provider remains `EVALUATION_IN_PROGRESS` with `productionReady=false`; a captured model response and English/Telugu quality remain unverified.


## 2026-10-14 — Provider Inference and Provenance Checkpoint

The local Ollama provider was exercised from the compiled backend adapter using synthetic prompts only. The installed Qwen3 1.7B Q4_K_M model returned an English response in 6.1 seconds warm and a Telugu response in 29.9 seconds warm. Both results carried the observed installed model digest 8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7. Runtime binds to loopback; OLLAMA_NO_CLOUD=true; no cloud fallback was attempted.

A provenance defect was fixed: generation now checks runtime/model health before sending the prompt and uses the actual installed model digest instead of UNVERIFIED_LOCAL_MODEL. Missing model/runtime fails closed. AI tests: 11 suites / 105 tests PASS; backend build PASS; frontend build PASS; git diff --check PASS.

The provider remains EVALUATION_IN_PROGRESS and productionReady=false. Synthetic phrases are not a native-speaker quality or safety benchmark. The fact-draft lifecycle has validated preview, exact-preview confirmation, rejection, authorization rechecks and transactional audit, but only the authenticated user's allowlisted profile fields currently have an apply handler through UsersService.update. Farm/Crop/Livestock/Marketplace drafts remain unapplied until the reusable multi-field workflow calls each normal authorized module service. Indic ASR remains a placeholder. Do not claim the AI platform or all modules COMPLETE.
