# KrishiKendram Production Deployment

## Prerequisites

- Docker Engine / Docker Compose
- Production PostgreSQL volume or managed PostgreSQL
- Strong POSTGRES_PASSWORD
- Strong JWT_SECRET
- Correct CORS_ORIGINS
- Correct frontend VITE_API_BASE_URL

## First deployment

1. Create a production environment file from the supplied environment template.
2. Set POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGINS, and VITE_API_BASE_URL.
3. Validate the stack:
   docker compose --env-file .env -f docker-compose.prod.yml config
4. Build the images:
   docker compose --env-file .env -f docker-compose.prod.yml build
5. Start PostgreSQL and wait for its health check:
   docker compose --env-file .env -f docker-compose.prod.yml up -d postgres
6. Apply Prisma migrations before starting application traffic:
   docker compose --env-file .env -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
7. Start backend and frontend:
   docker compose --env-file .env -f docker-compose.prod.yml up -d backend frontend
8. Verify backend /api/v1/health and frontend /healthz.

## Updates

1. Build the new images:
   docker compose --env-file .env -f docker-compose.prod.yml build
2. Keep PostgreSQL running and healthy:
   docker compose --env-file .env -f docker-compose.prod.yml up -d postgres
3. Apply pending migrations before application traffic:
   docker compose --env-file .env -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
4. Start/recreate application services:
   docker compose --env-file .env -f docker-compose.prod.yml up -d backend frontend
5. Verify both health endpoints and inspect recent logs.

## Backup and recovery

Create a logical PostgreSQL backup before a release or other high-impact database change:

   docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres -d krishikendram -Fc > krishikendram-YYYYMMDD-HHMM.dump

Restore only into an intentionally selected recovery database/instance. Do not overwrite production data casually. For a controlled restore, stop application traffic, restore with pg_restore, validate the restored database, then bring the application services back up.

The Docker volume is persistent, but a persistent volume is not a backup. Keep backups outside the production container/volume and test restoration periodically.

## Operational rules

- Never run prisma migrate reset against production data.
- Never delete the production PostgreSQL volume as part of a normal deployment.
- Never store production secrets in Git.
- Keep the release tag and deployment commit recorded together.
- Verify health checks after every restart or deployment.
- Backend containers receive SIGTERM cleanly and NestJS shutdown hooks release Prisma connections before process exit.
