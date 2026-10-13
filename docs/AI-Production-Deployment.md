# AI Runtime — Production Deployment Contract

Status: implementation in progress; this document is the acceptance contract, not a claim of production readiness.

## Deployment invariants

- No runtime code may assume Windows, WSL, a drive letter, or a developer home directory.
- All mutable paths and endpoints come from validated environment configuration.
- The API and ASR inference runtime are separate processes/services. The API must not import Torch/ONNX into the NestJS process.
- The ASR runtime loads model sessions once at startup and reuses them. It must not load the 600M model on every request.
- PostgreSQL remains the source of truth. AI returns suggestions only; persistence requires normal authorization, registry validation, and explicit user confirmation.
- Model files are provisioned as a versioned deployment artifact or read-only mounted model directory. They are not downloaded during API startup.
- No database volume, model directory, or user data may be deleted as part of deployment or troubleshooting.

## Configuration contract

The ASR runtime must accept configuration for:
- model directory and model/version identifier;
- bind host and port;
- request-size limit and inference timeout;
- CPU thread limit and concurrency limit;
- authentication secret supplied by the deployment secret manager;
- health/readiness endpoints;
- log level and structured log output.

The NestJS API must accept configuration for:
- ASR service base URL;
- service request timeout;
- service authentication secret;
- accepted audio formats, maximum upload size, and allowed languages.

Secrets must not be committed, baked into images, returned by status endpoints, or written to logs. Startup must fail closed when required production settings are absent.

## Runtime and API behavior

- Liveness reports that the process is running without forcing a model inference.
- Readiness reports success only after required model assets are present and inference sessions have loaded.
- The inference endpoint validates language, WAV/audio format, size, duration, and sample rate before inference.
- Bound concurrent inference and return clear 4xx/429/5xx responses; do not let a burst of requests exhaust memory.
- Requests have unique correlation IDs. Logs include provider/model version, duration, status, and correlation ID, but never audio bytes, secrets, or transcript content by default.
- Temporary audio files use a private directory, safe generated names, restrictive permissions, and guaranteed cleanup.
- API-to-ASR communication is authenticated and uses a private network in deployment.
- A health failure must not be misreported as successful transcription.

## Portability target

A cloud VM or standalone Linux deployment must use the same container images, environment-variable names, health checks, and startup contract as local development. Host-specific paths belong only in local environment files and compose bind mounts. Production uses read-only model mounts or an explicit persistent model volume; no host path is embedded in application code.

## Acceptance gates before declaring production-ready

1. Existing PostgreSQL data and recovery checkpoint verified; no destructive reset.
2. Python environment and model asset inventory/version recorded.
3. Real transcription test passes on the current host with the expected language and non-empty text.
4. Persistent inference service passes readiness/liveness checks and reuses loaded model sessions.
5. NestJS provider communicates with that service over the configured endpoint and has timeout/error handling.
6. End-to-end API test covers unsupported language, malformed audio, oversized audio, timeout, unavailable ASR service, and a valid transcription.
7. Backend/frontend builds and relevant tests pass; API and frontend remain listening after startup.
8. Compose deployment starts in dependency order, survives restart, and reports unhealthy services accurately.
9. No secrets or machine-specific paths are found in tracked runtime configuration.
10. A clean Linux deployment rehearsal is documented, including backup, restore, migration, rollback, and model provisioning.

## Current verified gap

The current NestJS `IndicConformerProvider.transcribe()` throws a ServiceUnavailableException because the inference bridge is not enabled. The CTC test runner has been made path-configurable, but a fresh transcription on the current D: setup has not yet passed. The API and frontend were not listening at the latest port check. Do not mark the AI feature or full application production-ready until the acceptance gates above pass.

## CPU-first free/open-source voice platform selection (2026-10-13)

The host has an Intel i3-5005U (2C/4T), about 12 GiB RAM and no discrete CUDA GPU. A full NeMo/PyTorch stack is not the first install choice. Keep ASR/TTS/LLM as separately versioned services; NestJS must not import large inference frameworks. No model downloads during app startup.

- LLM candidate: Ollama plus a small quantized model; not installed. Verify artifact and license and measure memory/latency before enabling.
- First ASR benchmark: whisper.cpp with quantized multilingual tiny/base; test Telugu, Hindi, code-mixing, farm noise, names, numbers and units. MIT implementation license does not replace model asset checks.
- Indic ASR comparison: AI4Bharat IndicConformerASR; defer NeMo/PyTorch until resource tests justify it.
- Indic TTS: evaluate AI4Bharat Indic-TTS checkpoints; verify exact model, dependencies and use/redistribution licenses. IndicF5 is deferred pending resource and reference-audio review.
- IndicTrans2 is optional; checkpoints are MIT while some dataset artifacts require attribution.
- Browser speech is fallback only, not guaranteed offline/private or equally supported. FFmpeg is not installed unless the selected audio contract requires it and the exact build license is reviewed.
- No paid/metered hosted service is a free unlimited dependency. Cloud remains off unless separately approved with consent, terms, cost limits and routing policy.

### Conversational form-fill acceptance
The agent must capture intent, ask concise follow-ups for missing required fields, preserve original transcript and language metadata, show draft values in the correct module, detect invalid/conflicting/existing values through central field policy, read back exact proposed changes, obtain explicit confirmation, and invoke the authenticated module API. It must report the outcome and leave an audit/rollback reference. Role capabilities must come from server-authorized registry data; frontend hard-coded route phrases are navigation helpers only.

### Rollback for support-stack setup
Before installation, record official source, version, signature/checksum, path, environment changes, model path, disk footprint and baseline health. Preserve existing app/DB recovery checkpoints. Keep models separate and never delete old assets automatically. Roll back by disabling the provider in the registry, stopping only the new sidecar, restoring prior config/environment and verifying app/API/DB health.


### Cloud connection: visible but fail-closed

The central cloud policy is `ai/connections/cloud-connection-policy.json` and is surfaced through the God Mode AI control plane. It is disabled by default and its current validator rejects `enabled=true` until a production cloud adapter and approval workflow exist. Do not store tokens or API keys in the registry. Use a secret manager/environment reference, HTTPS-only endpoints, per-disclosure user consent, provider/model/dataset license review, bounded health checks, audit, and rollback. `cloudFallbackAllowed` remains false; a future explicit cloud primary must not become an implicit fallback.
