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
4. Build and start the stack:
   docker compose --env-file .env -f docker-compose.prod.yml up -d --build
5. Apply Prisma migrations explicitly:
   docker compose --env-file .env -f docker-compose.prod.yml exec backend npx prisma migrate deploy
6. Verify frontend /healthz and backend /api/v1/health.

## Updates

   docker compose --env-file .env -f docker-compose.prod.yml up -d --build
   docker compose --env-file .env -f docker-compose.prod.yml exec backend npx prisma migrate deploy

Never run prisma migrate reset against production data. Do not store production secrets in Git.
