# Pending Pull Requests

Generated: 2026-02-03

## Action Required

GitHub CLI needs authentication to create PRs programmatically.

**Option 1 - Authenticate gh CLI:**
```bash
gh auth login
```

**Option 2 - Create PRs manually via these links:**

---

## PR 1: Dependency Updates
- **Branch:** `feature/dependency-updates`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/dependency-updates
- **Title:** `chore: update dependencies (Express 5, EJS 4)`
- **Description:**
  - Express 4 → 5, EJS 3 → 4
  - All tests pass

---

## PR 2: OpenAPI/Swagger Documentation
- **Branch:** `feature/openapi-swagger`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/openapi-swagger
- **Title:** `feat: add OpenAPI/Swagger documentation`
- **Description:**
  - OpenAPI 3.0 spec with swagger-jsdoc
  - Interactive Swagger UI at /api-docs

---

## PR 3: E2E Tests with Playwright
- **Branch:** `feature/e2e-playwright`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/e2e-playwright
- **Title:** `feat: add E2E tests with Playwright`
- **Description:**
  - 17 comprehensive E2E tests
  - CI pipeline with e2e-tests job

---

## PR 4: Metrics & Monitoring
- **Branch:** `feature/metrics-monitoring`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/metrics-monitoring
- **Title:** `feat: add metrics and monitoring endpoints`
- **Description:**
  - Add MetricsService to track request metrics
  - Enhanced /health endpoint with system info
  - New /metrics endpoint with performance data

---

## PR 5: Advanced Rate Limiting
- **Branch:** `feature/rate-limiting-advanced`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/rate-limiting-advanced
- **Title:** `feat: add advanced sliding window rate limiter`
- **Description:**
  - Sliding window rate limiting algorithm
  - Per-endpoint configuration (search, pokemon, system, static)
  - Standard rate limit headers (X-RateLimit-*)
  - 16 new unit tests

---

## PR 6: Redis Caching
- **Branch:** `feature/redis-caching`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/redis-caching
- **Title:** `feat: add Redis caching with cache-aside pattern`
- **Description:**
  - Redis cache-aside pattern implementation
  - CacheService with Redis support
  - Cache invalidation strategies
  - Graceful fallback to in-memory cache

---

## PR 7: Redis Rate Limiter
- **Branch:** `feature/redis-rate-limiter`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/redis-rate-limiter
- **Title:** `feat: add distributed rate limiting with Redis`
- **Description:**
  - Distributed rate limiting using Redis
  - Lua scripts for atomic operations
  - Graceful fallback when Redis unavailable

---

## PR 8: Internationalization (i18n) - NEW
- **Branch:** `feature/i18n`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/i18n
- **Title:** `feat: add internationalization (i18n) support for PT-BR and EN`
- **Description:**
  - I18nService with translations for PT-BR (default) and EN
  - i18nMiddleware for language detection (query, cookie, Accept-Language)
  - All 5 EJS views updated with language switcher UI
  - cookie-parser for locale persistence
  - 31 new unit tests (97 total)

---

## Recommended Merge Order

For cleanest integration, merge in this order:

1. `feature/dependency-updates` - Base updates
2. `feature/openapi-swagger` - API docs
3. `feature/e2e-playwright` - E2E tests
4. `feature/metrics-monitoring` - Monitoring
5. `feature/rate-limiting-advanced` - In-memory rate limiting
6. `feature/redis-caching` - Redis caching layer
7. `feature/redis-rate-limiter` - Redis rate limiting
8. `feature/i18n` - Internationalization

---

## After Creating PRs

Once PRs are created and merged, delete this file:
```bash
rm .plcode/PENDING_PRS.md
```
