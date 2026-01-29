# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Scanning

This project uses multiple layers of automated security scanning:

### Dependency Vulnerabilities
- **npm audit**: Runs on every CI build (fails on high/critical)
- **Trivy**: Weekly vulnerability scanning for dependencies
- **Socket Security**: Supply chain attack detection on PRs

### Code Analysis
- **CodeQL**: Semantic security analysis (weekly + on PRs)
- **Semgrep**: SAST scanning with security-audit ruleset
- **Gitleaks**: Secret detection in code and commit history

### Security Metrics
- **OpenSSF Scorecard**: Weekly security posture evaluation
- **GitHub Security Tab**: Centralized vulnerability tracking

### What We Scan For
- Known CVEs in dependencies
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Regular expression denial of service (ReDoS)
- Path traversal attacks
- Secrets in code (API keys, tokens, passwords)
- Supply chain attacks (malicious packages, typosquatting)
- Insecure cryptographic practices
- Prototype pollution

## Reporting a Vulnerability

If you discover a security vulnerability in this project:

### Contact

**Email:** security@ansvar.eu

**Please DO NOT:**
- Open a public GitHub issue
- Disclose the vulnerability publicly before we've had a chance to address it

### What to Include

1. **Description**: Clear explanation of the vulnerability
2. **Steps to Reproduce**: Detailed instructions to reproduce the issue
3. **Impact Assessment**: Potential security impact and affected components
4. **Suggested Fix**: If you have one (optional but appreciated)
5. **Your Contact Info**: So we can follow up with questions

### Response Timeline

| Severity | Initial Response | Fix Timeline |
|----------|-----------------|--------------|
| Critical | 24 hours | 7 days |
| High | 48 hours | 30 days |
| Medium | 5 days | 90 days |
| Low | 2 weeks | Next release |

We will:
1. **Acknowledge** receipt within the timeline above
2. **Validate** the vulnerability and determine severity
3. **Develop** and test a fix
4. **Release** a patched version
5. **Disclose** the vulnerability publicly after the fix is available

## Scope

### In Scope

- MCP server implementation (`src/` directory)
- Database layer and query construction
- Input validation and sanitization
- Dependencies and supply chain
- Build and publishing process
- GitHub Actions workflows

### Out of Scope

- **Regulation content accuracy**: We ingest from official government sources (eCFR.gov, regulations.gov, state legislative sites). Content issues should be reported to the source agencies.
- **Third-party MCP clients**: Issues with Claude Desktop, Cursor, or other clients should be reported to their respective projects.
- **User's local environment**: Configuration issues outside the MCP server itself.

## Security Best Practices

This project follows OpenSSF Best Practices for secure development:

### Code Security
- ✅ All database queries use prepared statements (no SQL injection)
- ✅ Input validation on all tool parameters
- ✅ Read-only database access (no write operations from tools)
- ✅ No execution of user-provided code
- ✅ Type-safe TypeScript with strict mode

### Supply Chain Security
- ✅ `package-lock.json` committed for reproducible builds
- ✅ Minimal dependency footprint
- ✅ Regular dependency updates via automated checks
- ✅ npm provenance attestation for published packages
- ✅ MCP Registry cryptographic signing

### Development Practices
- ✅ Automated security testing in CI/CD
- ✅ Code review required for all changes
- ✅ Branch protection on main branch
- ✅ Signed commits encouraged
- ✅ Pre-commit hooks for local validation

## Database Security

The regulation database (`data/regulations.db`) is:
- **Pre-built and version-controlled** (tamper evident)
- **Opened in read-only mode** (no write risk from tools)
- **Source data from official government sites** (auditable)
- **Ingestion scripts require manual execution** (no auto-download from arbitrary sources)

## Third-Party Dependencies

We minimize dependencies and regularly audit them:

### Core Runtime
- Node.js 18+
- TypeScript 5.9
- better-sqlite3 (native SQLite binding)

### MCP Framework
- @modelcontextprotocol/sdk (official Anthropic package)

### Build & Test
- tsx, vitest, @types/* (dev dependencies only)

All dependencies are:
- Tracked in `package-lock.json`
- Scanned for vulnerabilities on every CI run
- Monitored for supply chain attacks via Socket Security
- Updated regularly via automated checks

## Recognition

Security researchers who responsibly disclose vulnerabilities will be:
- Acknowledged in the CHANGELOG (unless they prefer to remain anonymous)
- Credited in the security advisory (if applicable)
- Thanked publicly for helping improve the project

---

**Last Updated:** 2026-01-29
