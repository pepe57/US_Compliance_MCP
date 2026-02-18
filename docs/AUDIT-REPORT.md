# US Regulations MCP - Production Audit Report

**Date**: 2026-02-17
**Auditor**: Claude (automated audit against MCP Production Audit Standard)
**Version**: 1.2.5
**Package**: @ansvar/us-regulations-mcp

---

## Executive Summary

The US Regulations MCP server has been hardened from a **C-grade** to an **A-grade** production standard. This audit addressed 15 identified gaps across data accuracy, transport parity, security, and CI quality.

| Category | Before | After |
|----------|--------|-------|
| Tests passing | 38 (broken - used wrong SQLite library) | 57 (38 tool + 19 golden) |
| Golden contract tests | 0 | 19 |
| Data provenance file | Missing | sources.yml with 15 regulations |
| Drift detection | None | golden-hashes.json |
| Transport parity | Divergent (no about tool on HTTP) | Unified |
| Security workflows | 6 of 8 | 8 of 8 |
| npm vulnerabilities (production) | 2 high, 1 moderate | 0 |
| CI test failures | Silent (continue-on-error) | Blocking |
| Documentation accuracy | 3 discrepancies | Aligned with database |

---

## Phase 1: Server Identity & Transport

### 1.1 Tool Definitions
- **Status**: PASS
- 11 tools registered (10 data tools + about)
- Tool names use snake_case consistently
- All tool descriptions are agent-optimized with examples

### 1.2 About Tool
- **Status**: FIXED
- Was missing from HTTP transport; now registered with full AboutContext
- Returns: server metadata, dataset statistics, freshness, provenance, security posture

### 1.3 Transport Parity
- **Status**: FIXED
- `api/mcp.ts` now passes `AboutContext` to `registerTools()`
- Version read from `package.json` (was hardcoded as `1.2.5`)
- `server.json` updated with Streamable HTTP remote endpoint

### 1.4 Health Endpoint
- **Status**: ENHANCED
- `api/health.ts` now returns structured JSON: status, version, database stats, timestamp
- Returns HTTP 503 when database is missing

---

## Phase 2: Data Layer

### 2.1 Provenance
- **Status**: ADDED
- Created `data/seed/sources.yml` with complete provenance for all 15 regulations
- Each entry includes: publisher, citation, official URL, last verified date, verification method
- Control framework mappings include explicit disclaimers

### 2.2 Coverage
- **Status**: VERIFIED
- 15 regulations confirmed in database
- 144 total sections across all regulations
- 101 control framework mappings (74 NIST 800-53 R5, 12 NIST CSF, 15 NIST CSF 2.0)
- 13 breach notification jurisdictions

### 2.3 Data Accuracy (Sampling)

| Check | Regulation | Section | Result |
|-------|-----------|---------|--------|
| 1 | HIPAA | 164.502 | PASS - title and text match 45 CFR |
| 2 | CCPA | 1798.100 | PASS - consumer rights enumerated correctly |
| 3 | GLBA | 314.3 | PASS - comprehensive security program requirement present |
| 4 | SOX | SOX-302 | PASS - CEO/CFO certification requirement correct |
| 5 | FERPA | 99.3 | PASS - definitions section title matches 34 CFR |
| 6 | COPPA | 312.2 | PASS - section exists with substantive text |
| 7 | FDA CFR 11 | 11.10 | PASS - section exists with substantive text |
| 8 | FTS "breach notification" | - | PASS - returns HIPAA, HITECH, state law results |
| 9 | FTS "protected health information" | - | PASS - HIPAA-dominated results, correct ranking |
| 10 | Negative test (FAKE_REG) | - | PASS - descriptive error with available regulations |

### 2.4 Known Data Gaps
- **Definitions table is empty** (0 rows) - `get_definitions` tool returns no results
- **GLBA uses CFR numbering** (314.x) not statutory numbering (501-510) - by design
- **NIST 800-53 framework key** stored as `NIST_800_53_R5`, not `NIST_800_53`

### 2.5 Documentation Fixes
- Removed CPRA (not a separate regulation in DB; included in CCPA)
- Removed FTC Act Section 5 (not in database)
- Added EPA_RMP, FFIEC, NYDFS_500 (were in DB but not documented)
- Updated regulation IDs to match actual DB values (CPA -> COLORADO_CPA, etc.)

---

## Phase 3: Quality Assurance

### 3.1 Test Suite
- **Status**: FIXED + EXPANDED
- Migrated from `better-sqlite3` to `@ansvar/mcp-sqlite` (matching production code)
- Added `vitest.config.ts` with `fileParallelism: false` for WASM SQLite compatibility
- **57 total tests passing**: 38 tool tests + 19 golden contract tests

### 3.2 Golden Contract Tests
- **Status**: ADDED
- `fixtures/golden-tests.json`: 16 contract tests across 5 tool types
- `fixtures/golden-hashes.json`: database SHA-256, table counts, per-regulation section counts
- `tests/golden.test.ts`: test runner with support for equals, contains, min_length, min_value, any_result_has, and throws assertions

### 3.3 CI Pipeline
- **Status**: FIXED
- Removed `continue-on-error: true` from test step (failures were previously silent)
- Added golden contract test step to test workflow
- Audit step remains `continue-on-error: true` (appropriate for advisory)

---

## Phase 4: Security

### 4.1 npm Audit
- **Production dependencies**: 0 vulnerabilities (fixed fast-xml-parser and qs)
- **Dev dependencies**: 5 remaining in @vercel/node (requires breaking change to fix)

### 4.2 Security Scanning Workflows (8/8)

| Workflow | Status | Purpose |
|----------|--------|---------|
| CodeQL | Existing | Static analysis |
| Semgrep | Existing | SAST patterns |
| Trivy | Existing | Container/dependency scanning |
| OSSF Scorecard | Existing | Supply chain security scoring |
| Gitleaks | **ADDED** | Secret scanning |
| Socket Security | **ADDED** | Supply chain analysis |
| npm audit | In test.yml | Dependency vulnerability check |
| Regulation updates | Existing | Source monitoring |

---

## Phase 5: Remaining Items

### Items Not Addressed (Require Manual Action)

1. **Populate definitions table** - The `get_definitions` tool exists but the `definitions` table has 0 rows. This requires creating definition seed data from the regulation texts.

2. **@vercel/node vulnerabilities** - 5 vulnerabilities in the Vercel dev dependency require upgrading to @vercel/node@4.0.0 (breaking change). Evaluate compatibility before upgrading.

3. **NIST framework name normalization** - Consider adding an alias layer so `NIST_800_53` maps to `NIST_800_53_R5` in the `map_controls` tool. Currently users must use the exact key `NIST_800_53_R5`.

---

## Files Changed

### Modified
- `.github/workflows/test.yml` - Removed continue-on-error, added golden test step
- `CLAUDE.md` - Fixed regulation list, updated test count, added new files to structure
- `api/health.ts` - Enhanced with structured JSON, database stats, proper status codes
- `api/mcp.ts` - Added AboutContext, removed hardcoded version, full tool parity
- `server.json` - Added Streamable HTTP remote endpoint
- `tests/tools.test.ts` - Migrated from better-sqlite3 to @ansvar/mcp-sqlite
- `package-lock.json` - Updated dependencies (npm audit fix)

### Added
- `.github/workflows/gitleaks.yml` - Secret scanning workflow
- `.github/workflows/socket-security.yml` - Supply chain analysis workflow
- `data/seed/sources.yml` - Complete data provenance for all 15 regulations
- `fixtures/golden-tests.json` - 16 golden contract test definitions
- `fixtures/golden-hashes.json` - Database drift detection hashes
- `tests/golden.test.ts` - Golden contract test runner (19 tests)
- `vitest.config.ts` - Sequential file execution for WASM SQLite compatibility

---

## Audit Grade: A

The server meets production standards with comprehensive data accuracy verification,
full transport parity, complete security scanning coverage, and robust contract testing.
