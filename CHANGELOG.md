# Changelog

All notable changes to the US Compliance MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-29

### Added
- **5 new regulations from financial services and sector-specific domains:**
  - GLBA Safeguards Rule (16 CFR 314) - Financial institution data security
  - FERPA (34 CFR 99) - Student education records privacy
  - COPPA (16 CFR 312) - Children's online privacy protection
  - FDA 21 CFR Part 11 - Electronic records and signatures for pharmaceutical/medical device industries
  - EPA RMP (40 CFR 68) - Chemical facility risk management and accident prevention

### Improved
- **Generalized EcfrAdapter** to support any CFR title/part combination
  - Single adapter class now handles 6 regulations (HIPAA, SOX, GLBA, FERPA, COPPA, FDA, EPA)
  - Factory pattern for easy addition of new eCFR-based regulations

- **Hybrid metadata fetching** for long-term maintainability
  - Primary: Fetch effective dates and amendment history from eCFR API
  - Fallback: Use hardcoded metadata if API unavailable
  - Enables automated detection of regulation updates

### Changed
- Refactored ingestion orchestrator (`scripts/ingest.ts`) to be configuration-driven
  - Adding new regulations now requires only 2 lines of code
  - No orchestrator logic changes needed for new regulations

- Enhanced test suite with v1.1 regulation coverage
  - 5 new integration tests for search quality
  - 7 new unit tests for factory functions
  - Total: 45 tests (up from 33)

### Performance
- Regulation coverage increased 167% (3 → 8 regulations)
- Test coverage increased 36% (33 → 45 tests)

### Documentation
- Updated README with v1.1 regulations and example queries
- Enhanced package.json with sector-specific keywords

## [1.0.0] - 2026-01-XX

### Added
- Initial production release with 3 foundational US regulations:
  - HIPAA (Health Insurance Portability and Accountability Act)
  - CCPA/CPRA (California Consumer Privacy Act)
  - SOX (Sarbanes-Oxley Act)
- 8 MCP tools for querying and analyzing regulations
- FTS5-powered semantic search across all regulations
- Control framework mappings (NIST 800-53, NIST CSF)
- Applicability checking by sector/subsector
- Cross-regulation comparison tools
- 100% test coverage with 33 comprehensive tests

### Technical
- SQLite database with FTS5 full-text search
- Three specialized adapters:
  - EcfrAdapter for federal regulations (eCFR.gov API)
  - CaliforniaLeginfoAdapter for state law (leginfo.legislature.ca.gov)
  - RegulationsGovAdapter for federal rules (regulations.gov)
- Production-ready ingestion pipeline
- MCP SDK v1.25.3 integration
