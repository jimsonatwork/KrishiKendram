# Production Dependency Remediation - 2026-10-15

## Finding

The backend production dependency audit identified critical GHSA-jqcg-44mw-7w3h in `proxy-addr`. The lockfile resolved `proxy-addr@2.0.7` through `@nestjs/platform-express` -> Express, leaving the production dependency tree exposed to IPv4-mapped IPv6 trust-subnet IP spoofing.

## Change

- Added the exact npm override `proxy-addr: 2.0.8` to `backend/package.json`.
- Updated only the `node_modules/proxy-addr` version, tarball URL, and integrity in `backend/package-lock.json`; unrelated lockfile churn was removed.
- No `npm audit fix --force`, broad dependency upgrades, or downgrades were used.
- Work was prepared in C (`/home/jj/Dev/KrishiKendram-Development`). A and B were not modified.

## Verification Evidence

- `npm --prefix backend audit --omit=dev`: PASS - 0 vulnerabilities.
- Isolated production `npm ci --omit=dev --ignore-scripts` using the changed manifest and lockfile completed; `npm ls proxy-addr --all` resolves `@nestjs/platform-express@11.2.6` -> `express@5.2.1` -> `proxy-addr@2.0.8`.
- Regression assertion against the installed 2.0.8 package: malformed `::ffff:10.0.0.0/8` no longer trusts public IPv4 `8.8.8.8`; correctly formed `::ffff:10.0.0.0/104` trusts `10.2.3.4` and not `8.8.8.8`: PASS.
- Backend `npm run build` in C: PASS. Note: C's pre-existing `node_modules` has `@nestjs/platform-express@11.1.28` despite the manifest requiring `^11.2.6`; the isolated production install independently verifies the patched locked tree without mutating C's existing installed dependencies.
- `git diff --check` with CRLF-aware whitespace handling: PASS.

## Remaining Risk / Next Activity

- The full backend audit still reports 22 findings (20 moderate, 1 high, 1 critical) when development dependencies are included; the production-only audit is clean. Review the development toolchain separately and avoid forced upgrades/downgrades without compatibility evidence.
- B has 221 staged paths, including its own dependency-manifest changes. Preserve that work and reconcile it before integrating this patch through the required C -> B -> A flow. Do not merge into or commit B's entire staged tree as part of this fix.
- No commit or promotion is claimed by this report; those steps remain pending final diff review and controlled integration.
