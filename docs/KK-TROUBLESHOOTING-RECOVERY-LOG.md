
---

## Recovery checkpoint — 2026-10-09

### Project and Git state
- Project root: `/home/jj/Dev/KrishiKendram`
- Branch: `main`
- Upstream: `origin/main`
- Git status: ahead by 31 commits
- Untracked path: `.cto-backup/`
- Untracked path: `docs/KK-ENVIRONMENT-FILE-MAP.txt`
- Protection rule: do not clean, reset, or delete untracked recovery material.

### Toolchain
- Node.js: `v24.18.0`
- npm: `11.16.0`
- Git: `2.53.0`

### Docker
- Docker CLI: not found in the Ubuntu shell.
- `systemctl is-active docker`: inactive.
- Root cause: not yet established.
- Do not install a second Docker engine inside WSL until Docker Desktop integration and the existing runtime arrangement have been identified.

### Service port checks
The following ports were not accepting TCP connections during this checkpoint:
- 3000 — backend
- 4000 — frontend
- 5432 — PostgreSQL
- 5555 — Prisma Studio

These results establish that no service was accepting connections on those ports at the time of testing. They do not establish whether the relevant processes are installed.

### Safe recovery priorities
1. Preserve `.cto-backup/` and the environment file map.
2. Inspect Docker Desktop and WSL integration.
3. Identify the existing PostgreSQL container and persistent storage before starting or rebuilding anything.
4. Check Git status and protect the 31 local commits.
5. Restore PostgreSQL, then backend, then frontend.
6. Verify Prisma migrations, backend health, application functionality, and administrative routes.
7. Record each command, result, fix, and verification outcome.

### Status
Environment identification completed. Application recovery pending.
