# Production Dependency Remediation - 2026-10-15

## Finding

The backend production dependency audit identified critical GHSA-jqcg-44mw-7w3h in `proxy-addr`. The lockfile resolved `proxy-addr@2.0.7` through `@nestjs/platform-express` -> Express, leaving the production dependency tree exposed to IPv4-mapped IPv6 trust-subnet IP spoofing.

## Change

- Pinned `joi` to `18.2.9` and added npm overrides for `deepmerge-ts: 8.0.2` and `proxy-addr: 2.0.8`.
- Updated only the relevant Joi, deepmerge-ts and proxy-addr lock entries plus the root Joi spec; unrelated lockfile churn was removed.
- No `npm audit fix --force`, broad dependency upgrades, or downgrades were used.
- The source fix was prepared in C (`/home/jj/Dev/KrishiKendram-Development`), then integrated in a clean B-derived worktree on `cto/security-remediation-20261015`. B candidate commit `e542ea7` was pushed to the `KrishiKendram-Integration` repository. The original B worktree and its 221 staged paths remain untouched; A received only this narrow package/lock/report change.

## Verification Evidence

- C production-only audit: PASS - 0 vulnerabilities.
- B-derived integration candidate production-only audit: PASS - 0 vulnerabilities.
- Isolated production `npm ci --omit=dev --ignore-scripts`: PASS (181 packages). The installed tree resolves `@nestjs/platform-express@11.2.6` -> `express@5.2.1` -> `proxy-addr@2.0.8`, `joi@18.2.9`, and Prisma -> `@prisma/config@6.19.3` -> `deepmerge-ts@8.0.2`.
- Regression assertion against the installed 2.0.8 package: malformed `::ffff:10.0.0.0/8` no longer trusts public IPv4 `8.8.8.8`; correctly formed `::ffff:10.0.0.0/104` trusts `10.2.3.4` and not `8.8.8.8`: PASS.
- Backend `npm run build` in C: PASS. Note: C's pre-existing `node_modules` has `@nestjs/platform-express@11.1.28` despite the manifest requiring `^11.2.6`; the isolated production install independently verifies the patched locked tree without mutating C's existing installed dependencies.
- `git diff --check` with CRLF-aware whitespace handling: PASS.

## Remaining Risk / Next Activity

- The full development-inclusive audit is a separate review; remaining toolchain advisories must be assessed without forced upgrades or compatibility-blind downgrades.
- The original B worktree has 221 staged paths and remains untouched; this isolated security branch does not commit or overwrite that snapshot.
- C checkpoint commit `98b7d73` was pushed to `origin/cto/ai-governed-flow-20261013-canonical-base`; B candidate `e542ea7` passed its production audit and isolated install and was pushed to `cto/security-remediation-20261015` in `KrishiKendram-Integration`. Canonical commit `c0c8366` was pushed to `origin/main` after A's production-only audit reported zero vulnerabilities. The live runtime was updated to `proxy-addr@2.0.8`, the backend service restarted, and API health returned OK. The previous runtime package is preserved at `/tmp/kk-runtime-proxy-addr-2.0.7-backup-20261015`. The restart refreshed the protected God Mode artifacts at `backend/config/god-mode/rootpathss` and `rootpathss.kkt`; their contents were not read or disclosed.
