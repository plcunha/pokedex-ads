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

## PR 1: Metrics & Monitoring
- **Branch:** `feature/metrics-monitoring`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/metrics-monitoring
- **Title:** `feat: add metrics and monitoring endpoints`
- **Description:**
  - Add MetricsService to track request metrics
  - Enhanced /health endpoint with system info
  - New /metrics endpoint with performance data

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

## PR 4: Dependency Updates
- **Branch:** `feature/dependency-updates`
- **Create PR:** https://github.com/plcunha/pokedex-ads/pull/new/feature/dependency-updates
- **Title:** `chore: update dependencies (Express 5, EJS 4)`
- **Description:**
  - Express 4 → 5, EJS 3 → 4
  - All tests pass

---

## After Creating PRs

Once PRs are created and merged, delete this file:
```bash
rm .plcode/PENDING_PRS.md
```
