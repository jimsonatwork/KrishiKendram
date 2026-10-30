# KrishiKendram Live Execution Status

Last refreshed: 2026-10-19T07:52:38+05:30
Lifecycle action: SAFE FULL SHUTDOWN

- PASS: recoverable checkpoint created at /mnt/d/KrishiKendram/08-Recovery-Backup/KK-Safe-Shutdown/KK-checkpoint-20261019-075027
- PASS: Git bundle, staged/unstaged patches, and untracked-file archives captured for A/B/C roots.
- PASS: PostgreSQL dump validated if the container was running; see checkpoint manifest.
- PASS: PostgreSQL container stopped without deleting Docker volumes.
- PASS: API/frontend systemd units stopped and ports 3000/4000 verified clear.
- AI: only a process explicitly started and owned by kk-start is stopped. Cloud fallback remains disabled.
- Docker Desktop: graceful shutdown requested only when no unrelated containers remain; Docker backend is never force-killed.
- WSL: shutdown request follows this status write.
- No Git stage, commit, push, reset, cleanup, or promotion was performed.

Resume: run kk-start. It starts Docker Desktop if needed, starts the existing PostgreSQL container without volume reset, optionally starts local Ollama only when KK_AI_ALLOW_LOCAL_EVALUATION=true, then verifies API/UI health.
