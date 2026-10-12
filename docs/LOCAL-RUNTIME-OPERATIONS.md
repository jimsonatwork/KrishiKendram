# KrishiKendram Local Runtime Operations

Updated: 2026-10-11

## Active local endpoints

- Frontend: http://localhost:4000/
- API health: http://localhost:3000/api/v1/health
- PostgreSQL: existing Docker container `krishikendram-postgres`, database `krishikendram`
- Canonical project root: `/home/jj/Dev/KrishiKendram`

## Process supervision

The API and frontend are managed by systemd user services rather than detached shell jobs:

- `krishikendram-backend.service`: runs the built NestJS entry point from `backend/dist/src/main.js`
- `krishikendram-frontend.service`: runs Vite on port 4000
- Both services use `Restart=on-failure` and are enabled for the user manager.
- The current local startup command is `kk-start`; it starts PostgreSQL if necessary and validates real HTTP health responses.
- `kk-restart` builds the backend, restarts both supervised services, and waits for HTTP health.
- `kk-stop` stops API and frontend only. It deliberately leaves PostgreSQL and its data untouched.

Useful diagnostics:

```bash
systemctl --user --no-pager --full status krishikendram-backend.service krishikendram-frontend.service
journalctl --user -u krishikendram-backend.service -u krishikendram-frontend.service -n 100 --no-pager
curl -fsS http://127.0.0.1:3000/api/v1/health
curl -fsSI http://127.0.0.1:4000/
```

Do not delete Docker volumes, reset the database, or run migrations as a generic startup repair.

## God Mode login recovery

The canonical God Mode identity in the current code is `jimson@jimson.jimson`.

The current development behavior rotates its password during API initialization. Therefore an earlier password can become invalid whenever the API actually starts again. The latest credential is written to these protected files:

- `backend/config/god-mode/rootpathss`
- `backend/config/god-mode/rootpathss.kkt`

Current Linux path:

`/home/jj/Dev/KrishiKendram/backend/config/god-mode/rootpathss`

Windows File Explorer path:

`\\wsl.localhost\Ubuntu-26.04\home\jj\Dev\KrishiKendram\backend\config\god-mode\rootpathss`

Open the file locally to read the current password; do not paste it into chat, tickets, screenshots, logs, or source control. Both files currently use mode 0600. Never echo the password into terminal logs.

If login fails:
1. Confirm the frontend and API health endpoints both respond.
2. Open the current `rootpathss` file locally and use its current value, not a previously copied password.
3. Use the canonical identity above.
4. Do not repeatedly guess passwords; the login endpoint is rate-limited and repeated failures can lock the account.
5. If login still fails, inspect service logs and authentication response codes before changing the database or resetting the account.

## Production migration gates

The local development credential-artifact workflow is not a production secret-management solution. Before cloud/standalone production deployment:
- Replace per-process-start password rotation with an explicit, audited rotation/bootstrap workflow.
- Inject production secrets through a secret manager or protected deployment environment.
- Do not mount the development credential artifacts into a production container.
- Use production environment configuration, a production build, TLS at the edge, private database networking, and health/readiness checks.
- Test deployment and rollback on a clean Linux host with a verified database backup.

## Current checkpoint

- Backend build completed successfully.
- Built NestJS API and Vite frontend are supervised by systemd user services.
- `kk-start` passed its end-to-end local HTTP health checks.
- The existing PostgreSQL container was kept; no volume deletion or database reset was performed.
- AI inference bridge and fresh speech transcription remain separate unfinished acceptance gates.
