# KrishiKendram AI Platform Improvement Plan

Date: 2026-10-14
Status: Execution in progress; model promotion remains gated by measured evidence.

## Objective

Deliver a useful, low-latency AI assistant across KrishiKendram without making every module depend on a particular model or runtime. Central registries own model links, capability policy, context intents, evaluation criteria, and provider status. Modules continue to own data, validation, authorization, and writes.

## Findings from repository and live runtime

- The host profile is a two-core/four-thread Intel i3-5005U; WSL reports 5.7 GiB memory. Keep inference CPU-first and avoid a second large AI stack.
- Existing qwen3:1.7b Q4_K_M is about 1.36 GB on disk. An earlier authenticated request spent about 73 seconds in model generation; DB and authorization were not the bottleneck.
- The app already has centralized module contracts, authorization-before-context, a provider registry, model-link registry, conversation persistence and provenance. Reuse these instead of adding parallel frameworks.
- The current local model provider remains evaluation-only. A candidate must not become production-ready merely because it downloaded, linked, or ran once.
- qwen3.5:0.8b download was started for evaluation only, then paused because the D: mounted model store caused I/O contention while the app was being rebuilt/restarted. Partial blobs were retained for resume. The model is not installed/verified yet, and no production model switch was made.

## Architecture decisions

The canonical execution boundary and plug-and-play contract are documented in [AI Execution Architecture](./AI-EXECUTION-ARCHITECTURE.md) and linked from the central AI platform registry. The backend remains authoritative; provider/runtime choices are replaceable adapters, and each module opts in through a versioned capability contract.

1. **Deterministic-first orchestration.** Resolve centrally registered intents before calling an LLM. Exact user-owned record queries use the authorized module service and return a deterministic answer. This is faster and cannot hallucinate database rows. Unknown/free-form questions may use the local model if provider policy allows it.
2. **Separate link, evaluation, and production activation.** Linking does not download or activate a model. Evaluation selection does not alter the live model. Production activation is rejected unless the model is explicitly marked production-ready by the governed approval process. Unlinking never deletes model files or history.
3. **Keep Ollama as the first runtime.** Its local API supports keep-alive, streaming, think=false, tool calls and structured output. Do not add llama.cpp as a second daemon until same-model/same-quantization benchmarks prove a material advantage. llama.cpp supports quantized CPU inference and an OpenAI-compatible server, but duplicate runtimes cost disk, memory and operational complexity.
4. **RAG without a new vector service.** First build a versioned, source-attributed agricultural knowledge corpus and use PostgreSQL full-text search already available in the stack. Check whether pgvector is available in the existing PostgreSQL image before planning vector retrieval; do not add another database or run a destructive DB migration as part of model work. If justified, pgvector integrates into PostgreSQL and the Node/Prisma stack.
5. **Tool calls are proposals, not authority.** Model output can request registered tools only. Tool arguments are schema-validated and run through existing module services, canonical validation and authorization. State-changing actions require explicit user confirmation and audit. The model cannot write directly to the database.
6. **Voice is a separate capability.** Evaluate whisper.cpp and sherpa-onnx for consented Telugu/Indic speech samples, CPU latency, WER/CER, farm vocabulary and code-mixing. Browser Web Speech remains a clearly labelled fallback, not a guarantee of offline processing. Do not install heavyweight Python/PyTorch stacks without a measured need.
7. **Measure before promoting.** Report time-to-first-token, full response latency, prompt/output tokens, tokens per second, cold/warm timings, peak memory, answer correctness, groundedness, prompt-injection resistance and language-specific quality. Keep candidate results separate from production status.

## Implementation sequence and acceptance gates

### Phase A - Safe, fast foundation (in progress)
- [x] Keep one canonical model-link catalogue.
- [x] Add an independent evaluation-model selection field.
- [x] Prevent evaluation-only models from changing live model selection.
- [x] Add deterministic crop-list response using authorized crop reads, without invoking the LLM.
- [x] Pass focused backend tests (32 tests across 4 suites), frontend production build and service smoke tests (HTTP 200).
- [ ] Verify UI state reflects live model vs evaluation candidate.

### Phase B - Model benchmark
- [x] Register Qwen3.5 0.8B as an evaluation candidate.
- [ ] Resume and complete the model download during a quiet/maintenance window, then verify the local runtime reports it installed; partial blobs are retained.
- [ ] Select it for evaluation through God Mode (audited action).
- [ ] Benchmark current Qwen3 1.7B and candidate using the same fixed prompts, output cap and runtime settings during a quiet/maintenance window. Do not benchmark while normal app traffic is expected on this low-memory machine.
- [ ] Review answer quality manually against a rubric; no automatic script may mark a model production-ready.
- [ ] Promote only after speed, language quality, grounding and security gates pass.

### Phase C - Grounded agricultural knowledge
- [ ] Build a small, versioned, curated corpus with source URL/title/date/license and crop/region/language tags.
- [ ] Use keyword retrieval first; add pgvector only after extension compatibility and embedding quality are verified.
- [ ] Return evidence/source references with agricultural advice; distinguish general guidance from user-specific records and live market/weather data.
- [ ] Add tests for stale sources, contradictory evidence, unsupported claims and missing citations.

### Phase D - Authorized tools and form assistance
- [ ] Registry-defined tool catalogue with input/output schemas, role/capability policy and audit requirements.
- [ ] Read tools call existing module services; write tools only produce drafts until canonical validation and user confirmation.
- [ ] Add idempotency, conflict checks, provenance and rollback where supported.
- [ ] Test farmer, admin and God Mode access separately.

### Phase E - Voice and streaming
- [ ] Stream partial text to the UI only after persistence/error semantics and disconnect handling are tested.
- [ ] Compare quantized whisper.cpp and sherpa-onnx on consented multilingual samples; avoid running ASR and LLM concurrently on this low-memory machine unless measured safe.
- [ ] Preserve typed input, visible language/provider mode, mic consent, stop controls and retention policy.

## Research references

- Ollama API (official): https://github.com/ollama/ollama/blob/main/docs/api.md - keep-alive, streaming, think, tool calls, structured outputs and runtime metrics.
- llama.cpp (official): https://github.com/ggml-org/llama.cpp - quantized CPU inference and OpenAI-compatible llama serve; alternative runtime candidate, not an automatic replacement.
- pgvector (official): https://github.com/pgvector/pgvector - vector similarity search inside PostgreSQL; avoids a separate vector database if supported by the current DB image.
- pgvector Node (official): https://github.com/pgvector/pgvector-node - Node/Prisma integration options.
- whisper.cpp (official): https://github.com/ggml-org/whisper.cpp - CPU-capable quantized multilingual ASR and VAD.
- sherpa-onnx (official): https://github.com/k2-fsa/sherpa-onnx - local ASR/TTS/VAD options across CPU and Node.js.
- Ollama Qwen3.5 0.8B model card: https://ollama.com/library/qwen3.5:0.8b - lightweight candidate to measure, not assumed better until tested.

## Non-negotiable controls

- No implicit cloud fallback; no paid provider by default.
- Authorization before private context retrieval.
- No direct model database writes.
- User confirmation before state changes.
- Keep model links, evaluation selection and production approval distinct.
- Never delete model artifacts or user data as part of unlinking.
- Preserve existing DB volumes and data as part of AI work.
