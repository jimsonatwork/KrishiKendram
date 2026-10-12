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
