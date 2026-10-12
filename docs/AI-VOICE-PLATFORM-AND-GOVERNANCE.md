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
