# KrishiKendram AI and Web Toolchain Adoption Review

Date: 2026-10-14
Status: Adopt selected patterns; do not embed third-party agent runtimes in the farmer application.

## Decision

KrishiKendram keeps its own NestJS AI registry, module-owned services, authorization, audit, fact lifecycle, and confirmation boundary. External agents are development tools or optional adapters; they do not become a second authority plane.

| Candidate | Useful capability | Decision | Boundary |
|---|---|---|---|
| Hermes Agent (Nous Research) | Persistent memory, reusable skills, learning loop, multi-provider CLI | Adopt patterns; evaluate separately as a developer-side agent | Never import its memories/skills as trusted policy; scan and review skill provenance; no production DB credentials |
| OpenMuse (CopilotKit / AG-UI) | Persistent browser/terminal, visible task execution, long-running goals | Reference for a future supervised Super Admin operations workspace | Alpha; no direct access to farmer data, secrets, or module writes; require host-side exact-action approval |
| OpenChamber | Multi-model runs, isolated Git worktrees, diff walkthrough, previewing live web apps | Recommended optional developer workspace | Separate worktrees/branches; no shared writable production workspace; all changes pass tests and human review |
| OpenCharm | Voice/status companion and agent-agnostic ACP/MCP connection | Revisit only if KrishiKendram needs a dedicated companion/device | Not a replacement for VoiceAgent or the AI platform; avoid adding hardware/runtime dependencies now |
| Snyk DeepCode AI | Security-focused static analysis and remediation suggestions | Evaluate as an optional CI/security review integration | Hosted code disclosure and pricing/privacy terms require review; never auto-apply a security fix without tests/review; legacy deepcode_ai_fix repository is archived |
| OpenHands | Sandboxed, model-agnostic software-engineering agents and automation | Alternative to OpenChamber, not a simultaneous mandatory dependency | If evaluated, use an isolated workspace/sandbox with limited tokens and no production secrets |
| Playwright + axe-core | Browser end-to-end, interaction, regression, and automated accessibility tests | Adopt as frontend development tooling | Test against mock APIs by default; live DB tests remain separate and explicit; automated accessibility checks do not replace manual assessment |

## Architecture lessons to adopt

1. Model proposes; host authorizes. A model's tool call, output, priority, or confidence never grants permissions.
2. Fast path first. Local intent rules, authorized service queries, cached non-sensitive metadata, and guided form workflows should bypass generation where possible.
3. Specialists are replaceable. Routing selects a provider only when its exact provider/model identity is registered and approved for that task. Model priority is not authority.
4. Learn through a release pipeline. Record structured outcomes and user corrections with provenance; propose reusable skills/rules; run regression, privacy, authorization, and module-compatibility tests; publish only approved versioned changes. Do not train directly on raw conversations by default.
5. Tool calls have explicit lifecycle. Every mutation needs a typed schema, current authorization, preview, explicit confirmation, idempotency or duplicate-risk handling, normal module service, and audit evidence.
6. Browser testing is a release gate. Test voice interruption, transcript submission, draft preview, corrections, cancellation, confirmation, uncertain network outcomes, and keyboard/accessibility behavior.

## Model strategy

- Keep the current local Qwen3 1.7B model as the baseline while the local provider is evaluation-only.
- Evaluate installed Qwen3.5 0.8B as a separate candidate in an explicit maintenance window. Do not activate it automatically.
- Compare latency, first-token delay, memory, multilingual quality, groundedness, prompt-injection resistance, and task-specific correctness against the same benchmark suite.
- Consider larger/local specialist models only if measured quality gains justify memory and latency costs. Keep cloud providers disabled until God Mode authorization, disclosure consent, external secret storage, licensing, data residency, and audit controls are implemented.
- ASR and TTS are separate capabilities from text generation. Browser speech recognition may rely on a browser vendor; do not describe the voice stack as fully local unless the chosen ASR/TTS path has been verified.

## Release gates

- Unit/regression tests and backend/frontend production builds pass.
- Browser e2e exercises the actual VoiceAgent component with deterministic mocked APIs. The frontend-e2e GitHub Actions workflow installs the official Playwright Linux dependencies, type-checks the tests, runs the suite, and uploads traces on failure. On a fresh Linux/WSL host, install browser OS libraries with the official Playwright setup instructions, then run npm run test:e2e from frontend.
- Actual authenticated browser tests and DB persistence checks are performed separately against a safe test environment.
- git diff --check, registry-cohesion tests, dependency/security scans, and reviewed diffs pass.
- No model promotion, cloud fallback, data deletion, Docker reset, or live-service restart is implied by a passing test.
- Documentation and central registry pointers are updated together with implementation.

## Sources reviewed

- Hermes Agent: https://github.com/NousResearch/hermes-agent
- Hermes security rules: https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md
- OpenMuse: https://github.com/CopilotKit/openmuse
- OpenChamber: https://github.com/openchamber/openchamber
- OpenCharm: https://github.com/opencharm-labs/opencharm
- DeepCode AI: https://snyk.io/platform/deepcode-ai/
- Archived DeepCode AI Fix research code: https://github.com/snyk/deepcode_ai_fix
- OpenHands: https://github.com/OpenHands/OpenHands
- Playwright: https://playwright.dev/docs
- Linux browser prerequisites: https://playwright.dev/docs/browsers
- Playwright accessibility: https://playwright.dev/docs/accessibility-testing

## Current host note

The browser binaries downloaded, but the first Playwright launch failed because the WSL image lacks Linux shared libraries including libnspr4, libnss3 and libasound.so.2. The current tool session cannot use sudo/apt to add OS packages. Browser tests are authored and discoverable, but a passing browser run is not claimed until the standard Playwright Linux dependencies are installed. A non-forced npm audit fix was attempted but the npm registry request failed with EAI_AGAIN; no forced major dependency upgrade was applied.
