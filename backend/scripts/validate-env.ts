import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
const productionRequired = ['SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD'] as const;

const missing = required.filter((name) => !process.env[name]?.trim());
const productionMissing =
  process.env.NODE_ENV === 'production'
    ? productionRequired.filter((name) => !process.env[name]?.trim())
    : [];

const weakJwt =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32;

if (missing.length || productionMissing.length || weakJwt) {
  if (missing.length) console.error(`Missing required variables: ${missing.join(', ')}`);
  if (productionMissing.length)
    console.error(`Missing production recovery variables: ${productionMissing.join(', ')}`);
  if (weakJwt) console.error('JWT_SECRET must be at least 32 characters.');
  process.exit(1);
}

console.log('Environment contract: OK');
console.log(`NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`);
console.log(`DATABASE_URL: configured`);
console.log(`JWT_SECRET: configured (${process.env.JWT_SECRET!.length} chars)`);
if (process.env.SUPER_ADMIN_EMAIL) console.log('SUPER_ADMIN_EMAIL: configured');
if (process.env.SUPER_ADMIN_PASSWORD) console.log('SUPER_ADMIN_PASSWORD: configured');
