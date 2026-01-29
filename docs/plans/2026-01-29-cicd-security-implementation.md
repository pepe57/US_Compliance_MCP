# CI/CD & Security Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up comprehensive CI/CD pipeline with 10 GitHub Actions workflows, security scanning, automated publishing, and daily regulation update monitoring for US Compliance MCP.

**Architecture:** Copy and adapt proven workflows from EU Compliance MCP (47 regulations, production-tested), modify for US-specific sources (eCFR, regulations.gov, state sites), use Azure Key Vault for secret management, publish to npm + MCP Registry.

**Tech Stack:** GitHub Actions, CodeQL, Gitleaks, Semgrep, Trivy, Socket Security, OSSF Scorecard, Azure Key Vault, npm provenance, MCP Publisher CLI

---

## Task 1: Create Test Workflow

**Files:**
- Create: `.github/workflows/test.yml`

**Step 1: Copy EU MCP test workflow as template**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/test.yml`

**Step 2: Adapt for US MCP specifics**

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci --frozen-lockfile

      - name: Security audit
        run: npm audit --audit-level=high
        continue-on-error: true # Don't block on moderate vulnerabilities

      - name: Build TypeScript
        run: npm run build

      - name: Run tests
        run: npm test

      - name: Test Summary
        if: always()
        run: |
          echo "## Test Results" >> $GITHUB_STEP_SUMMARY
          echo "✅ Tests completed" >> $GITHUB_STEP_SUMMARY
```

**Step 3: Test workflow locally**

Run: `cd ~/Projects/US_Compliance_MCP/.worktrees/feature/cicd-security-setup && npm test`
Expected: All tests pass (22 passed, 0 failed)

**Step 4: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add test workflow with security audit

- Runs on push to main and all PRs
- npm audit for dependency vulnerabilities
- Runs all 7 test scripts
- Posts results to Actions summary"
```

---

## Task 2: Create CodeQL Security Scanning

**Files:**
- Create: `.github/workflows/codeql.yml`

**Step 1: Copy EU MCP CodeQL workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/codeql.yml`

**Step 2: Create CodeQL workflow**

Create `.github/workflows/codeql.yml`:

```yaml
name: CodeQL Security Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1' # Weekly on Mondays at 6 AM UTC

permissions:
  actions: read
  contents: read
  security-events: write

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-extended

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{matrix.language}}"
```

**Step 3: Commit**

```bash
git add .github/workflows/codeql.yml
git commit -m "security: add CodeQL semantic code analysis

- Scans JavaScript/TypeScript for security issues
- Runs weekly and on every push/PR
- Uses security-extended query suite
- Uploads results to GitHub Security tab"
```

---

## Task 3: Create Gitleaks Secret Scanning

**Files:**
- Create: `.github/workflows/gitleaks.yml`

**Step 1: Copy EU MCP Gitleaks workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/gitleaks.yml`

**Step 2: Create Gitleaks workflow**

Create `.github/workflows/gitleaks.yml`:

```yaml
name: Gitleaks Secret Scanning

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    name: Scan for secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 3: Commit**

```bash
git add .github/workflows/gitleaks.yml
git commit -m "security: add Gitleaks secret scanning

- Scans for API keys, tokens, passwords
- Runs on every push and PR
- Blocks PRs if secrets detected
- Uses official gitleaks-action@v2"
```

---

## Task 4: Create Semgrep SAST Scanning

**Files:**
- Create: `.github/workflows/semgrep.yml`

**Step 1: Copy EU MCP Semgrep workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/semgrep.yml`

**Step 2: Create Semgrep workflow**

Create `.github/workflows/semgrep.yml`:

```yaml
name: Semgrep Security Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  semgrep:
    name: Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/nodejs
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 3: Commit**

```bash
git add .github/workflows/semgrep.yml
git commit -m "security: add Semgrep SAST scanning

- Static analysis for security vulnerabilities
- Rulesets: security-audit, nodejs
- Detects SQL injection, XSS, crypto issues
- Fails on high/critical findings"
```

---

## Task 5: Create Trivy Vulnerability Scanning

**Files:**
- Create: `.github/workflows/trivy.yml`

**Step 1: Copy EU MCP Trivy workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/trivy.yml`

**Step 2: Create Trivy workflow**

Create `.github/workflows/trivy.yml`:

```yaml
name: Trivy Vulnerability Scan

on:
  schedule:
    - cron: '0 6 * * 1' # Weekly on Mondays
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    name: Scan dependencies
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

**Step 3: Commit**

```bash
git add .github/workflows/trivy.yml
git commit -m "security: add Trivy vulnerability scanning

- Scans dependencies for CVEs
- Runs weekly on Monday mornings
- Severity: CRITICAL and HIGH only
- Uploads to GitHub Security tab"
```

---

## Task 6: Create Socket Security Supply Chain Monitoring

**Files:**
- Create: `.github/workflows/socket-security.yml`

**Step 1: Copy EU MCP Socket workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/socket-security.yml`

**Step 2: Create Socket Security workflow**

Create `.github/workflows/socket-security.yml`:

```yaml
name: Socket Security

on:
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
  push:
    branches: [main]
    paths:
      - 'package.json'
      - 'package-lock.json'

permissions:
  contents: read
  pull-requests: write

jobs:
  socket-security:
    name: Monitor dependencies
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Socket Security
        uses: SocketDev/socket-security-action@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

**Step 3: Commit**

```bash
git add .github/workflows/socket-security.yml
git commit -m "security: add Socket Security supply chain monitoring

- Monitors npm dependencies for malicious packages
- Runs on package.json/lock changes
- Detects typosquatting, malware
- Free for open source projects"
```

---

## Task 7: Create OSSF Scorecard Security Metrics

**Files:**
- Create: `.github/workflows/ossf-scorecard.yml`

**Step 1: Copy EU MCP OSSF Scorecard workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/ossf-scorecard.yml`

**Step 2: Create OSSF Scorecard workflow**

Create `.github/workflows/ossf-scorecard.yml`:

```yaml
name: OpenSSF Scorecard

on:
  schedule:
    - cron: '0 6 * * 1' # Weekly on Mondays
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  id-token: write

jobs:
  analysis:
    name: Scorecard analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Run analysis
        uses: ossf/scorecard-action@v2
        with:
          results_file: results.sarif
          results_format: sarif
          publish_results: true

      - name: Upload to code-scanning
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

**Step 3: Commit**

```bash
git add .github/workflows/ossf-scorecard.yml
git commit -m "security: add OpenSSF Scorecard metrics

- Evaluates 18 security checks
- Runs weekly on Mondays
- Tracks security posture over time
- Publishes score badge for README"
```

---

## Task 8: Enhance Update Checking Workflow

**Files:**
- Modify: `.github/workflows/check-regulation-updates.yml`

**Step 1: Review existing workflow**

Read: `.github/workflows/check-regulation-updates.yml` (created by other Claude)

**Step 2: Add auto-branch + PR creation**

The workflow already exists but may need enhancement. Verify it has:
- Daily schedule trigger
- All 15 regulation source checks
- Feature branch creation on updates
- PR creation with summary

If missing auto-branch creation, add this step after the update check:

```yaml
      - name: Create feature branch for updates
        if: steps.check.outputs.has_updates == 'true'
        run: |
          BRANCH_NAME="auto-update/$(date +%Y-%m-%d)"
          git checkout -b "$BRANCH_NAME"
          echo "BRANCH_NAME=$BRANCH_NAME" >> $GITHUB_OUTPUT

      - name: Re-ingest changed regulations
        if: steps.check.outputs.has_updates == 'true'
        run: npm run ingest

      - name: Rebuild database
        if: steps.check.outputs.has_updates == 'true'
        run: npm run build:db

      - name: Commit changes
        if: steps.check.outputs.has_updates == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git commit -m "chore: auto-update regulations from official sources

          Updated regulations: ${{ steps.check.outputs.changed_regulations }}

          Co-Authored-By: GitHub Actions <github-actions[bot]@users.noreply.github.com>"

      - name: Create Pull Request
        if: steps.check.outputs.has_updates == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          branch: ${{ steps.create-branch.outputs.BRANCH_NAME }}
          title: "chore: automated regulation updates"
          body: |
            ## Automated Regulation Updates

            **Changes detected:** ${{ steps.check.outputs.changed_regulations }}

            **Source:** Daily update monitoring
            **Timestamp:** ${{ steps.check.outputs.check_time }}

            ### Review Checklist
            - [ ] Verify regulation content changes are accurate
            - [ ] Run tests to ensure database integrity
            - [ ] Check for breaking changes in article structure

            **Auto-generated by:** `.github/workflows/check-regulation-updates.yml`
```

**Step 3: Commit if modified**

```bash
git add .github/workflows/check-regulation-updates.yml
git commit -m "ci: enhance update workflow with auto-branch + PR

- Creates feature branch when updates detected
- Re-ingests changed regulations automatically
- Rebuilds database with updated content
- Creates PR for review before merge"
```

---

## Task 9: Create Publishing Workflow

**Files:**
- Create: `.github/workflows/publish.yml`

**Step 1: Copy EU MCP publish workflow**

Read: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/publish.yml`

**Step 2: Adapt for US MCP**

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm & MCP Registry

on:
  push:
    tags:
      - 'v*'  # Triggers on v1.3.0, v2.0.0, etc.

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Get version from tag
        id: version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "VERSION=$VERSION" >> $GITHUB_OUTPUT
          echo "📦 Version: $VERSION"

      - name: Update server.json version
        run: |
          if [ -f server.json ]; then
            sed -i 's/"version": "[^"]*"/"version": "${{ steps.version.outputs.VERSION }}"/' server.json
            echo "✅ Updated server.json to version ${{ steps.version.outputs.VERSION }}"
          fi

      - name: Install dependencies
        run: npm ci --frozen-lockfile

      - name: Build TypeScript
        run: npm run build

      - name: Rebuild database
        run: npm run build:db

      - name: Run tests
        run: npm test

      - name: Publish to npm
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Get MCP Publisher Private Key from Key Vault
        id: mcp-key
        run: |
          PRIVATE_KEY=$(az keyvault secret show \
            --vault-name kv-ansvar-dev \
            --name mcp-publisher-private-key \
            --query value -o tsv)
          echo "::add-mask::$PRIVATE_KEY"
          echo "PRIVATE_KEY=$PRIVATE_KEY" >> $GITHUB_OUTPUT
          echo "✅ Retrieved MCP publisher key from Key Vault"

      - name: Install MCP Publisher
        run: |
          curl -L -o mcp-publisher.tar.gz \
            https://github.com/modelcontextprotocol/registry/releases/download/v1.4.0/mcp-publisher_linux_amd64.tar.gz
          tar -xzf mcp-publisher.tar.gz
          chmod +x mcp-publisher
          sudo mv mcp-publisher /usr/local/bin/
          mcp-publisher --version

      - name: Authenticate with MCP Registry
        env:
          PRIVATE_KEY: ${{ steps.mcp-key.outputs.PRIVATE_KEY }}
        run: |
          mcp-publisher login dns -domain ansvar.eu -private-key "$PRIVATE_KEY"
          echo "✅ Authenticated with MCP registry"

      - name: Publish to MCP Registry
        run: |
          mcp-publisher publish
          echo "✅ Published to MCP registry"

      - name: Deployment Summary
        run: |
          echo "## 🎉 Publication Complete!" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Version:** \`${{ steps.version.outputs.VERSION }}\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### 📦 Published To:" >> $GITHUB_STEP_SUMMARY
          echo "- ✅ npm: https://www.npmjs.com/package/@ansvar/us-regulations-mcp/v/${{ steps.version.outputs.VERSION }}" >> $GITHUB_STEP_SUMMARY
          echo "- ✅ MCP Registry: https://registry.modelcontextprotocol.io" >> $GITHUB_STEP_SUMMARY
          echo "- ⏳ PulseMCP: Will auto-sync within 1-7 days" >> $GITHUB_STEP_SUMMARY
```

**Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add npm + MCP Registry publishing workflow

- Triggers on version tags (v*)
- Builds and tests before publishing
- npm publish with provenance attestation
- MCP Registry with Azure Key Vault signing
- Shares key with EU Compliance MCP"
```

---

## Task 10: Create SECURITY.md

**Files:**
- Create: `SECURITY.md`

**Step 1: Create security policy**

Create `SECURITY.md`:

```markdown
# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@ansvar.eu**.

### What to Include

Please include the following information:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Fix timeline**:
  - Critical: 7 days
  - High: 30 days
  - Medium: 90 days

### Scope

**In scope:**
- Server code (`src/`)
- Dependencies (`package.json`)
- Build process (`scripts/`)
- GitHub Actions workflows

**Out of scope:**
- Regulation content (sourced from official government sites)
- Third-party integrations (eCFR.gov, regulations.gov, etc.)

## Security Researcher Recognition

We appreciate responsible disclosure and will acknowledge security researchers in our CHANGELOG unless you prefer to remain anonymous.

## PGP Key

For encrypted communication, use our PGP key:
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
[To be added]
-----END PGP PUBLIC KEY BLOCK-----
```

## Security Best Practices

This project follows:
- OpenSSF Best Practices
- npm provenance attestation
- Automated security scanning (CodeQL, Semgrep, Trivy, Gitleaks)
- Supply chain monitoring (Socket Security)
- Weekly security metrics (OSSF Scorecard)
```

**Step 2: Commit**

```bash
git add SECURITY.md
git commit -m "docs: add security vulnerability disclosure policy

- Contact: security@ansvar.eu
- Response timelines by severity
- Scope definition (in/out)
- Security researcher recognition"
```

---

## Task 11: Create GitHub Secrets Setup Documentation

**Files:**
- Create: `.github/SECURITY-SETUP.md`

**Step 1: Create internal documentation**

Create `.github/SECURITY-SETUP.md`:

```markdown
# GitHub Actions Security Setup

**Internal Documentation** - How to configure GitHub secrets and Azure Key Vault access.

## Required GitHub Secrets

### 1. NPM_TOKEN

**Purpose:** Publish packages to npm registry

**How to create:**
1. Go to https://www.npmjs.com
2. Settings → Access Tokens
3. Generate New Token → Automation
4. Copy token
5. GitHub repo → Settings → Secrets and variables → Actions
6. New repository secret:
   - Name: `NPM_TOKEN`
   - Value: [paste token]

**Permissions:** Publish access to `@ansvar/us-regulations-mcp`

### 2. AZURE_CREDENTIALS

**Purpose:** Access Azure Key Vault for MCP publisher private key

**How to create:**

1. Create Azure Service Principal:
```bash
az ad sp create-for-rbac \
  --name "github-actions-us-mcp" \
  --role "Key Vault Secrets User" \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.KeyVault/vaults/kv-ansvar-dev \
  --sdk-auth
```

2. Copy the JSON output
3. GitHub repo → Settings → Secrets and variables → Actions
4. New repository secret:
   - Name: `AZURE_CREDENTIALS`
   - Value: [paste JSON]

**JSON Format:**
```json
{
  "clientId": "<GUID>",
  "clientSecret": "<STRING>",
  "subscriptionId": "<GUID>",
  "tenantId": "<GUID>",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

## Azure Key Vault Structure

**Vault:** `kv-ansvar-dev`

**Secrets:**
```
kv-ansvar-dev/
└── secrets/
    └── mcp-publisher-private-key
        ├── Used by: EU Compliance MCP
        ├── Used by: US Compliance MCP
        └── Used by: (future MCP servers)
```

**Access:**
- Service principal `github-actions-us-mcp` has "Get" permission
- Service principal `github-actions-eu-mcp` has "Get" permission
- Admin users have full access for key rotation

## Security Notes

- **Never store secrets directly in GitHub Actions secrets** (except AZURE_CREDENTIALS)
- Azure Key Vault is the single source of truth for MCP publisher key
- Both EU and US MCPs share the same publisher key (domain: ansvar.eu)
- Rotate keys regularly (recommended: every 90 days)
- Use `::add-mask::` in workflows to prevent secret logging

## Key Rotation Process

When rotating the MCP publisher private key:

1. Generate new key pair:
```bash
mcp-publisher keygen
```

2. Update Key Vault secret:
```bash
az keyvault secret set \
  --vault-name kv-ansvar-dev \
  --name mcp-publisher-private-key \
  --value "$(cat private-key.pem)"
```

3. Update DNS TXT record at ansvar.eu with new public key

4. No GitHub Actions changes needed - workflows automatically use new key

## Troubleshooting

**Error:** "Failed to retrieve secret from Key Vault"
- Check service principal has "Key Vault Secrets User" role
- Verify `AZURE_CREDENTIALS` is correctly formatted JSON
- Ensure Key Vault firewall allows GitHub Actions IP ranges

**Error:** "npm publish failed: authentication required"
- Verify `NPM_TOKEN` is valid and not expired
- Check token has publish permissions for `@ansvar` scope
- Regenerate token if needed

**Error:** "MCP publisher authentication failed"
- Verify private key in Key Vault matches DNS public key
- Check DNS TXT record at `_mcp.ansvar.eu`
- Ensure domain ownership hasn't changed
```

**Step 2: Commit**

```bash
git add .github/SECURITY-SETUP.md
git commit -m "docs: add GitHub Actions security setup guide

- NPM_TOKEN creation instructions
- Azure service principal setup
- Key Vault access configuration
- Key rotation procedures
- Troubleshooting guide"
```

---

## Task 12: Update README with Security Badges

**Files:**
- Modify: `README.md`

**Step 1: Add security badges**

After line 8 (existing badges), add:

```markdown
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Ansvar-Systems/US_compliance_MCP/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Ansvar-Systems/US_compliance_MCP)
[![CodeQL](https://github.com/Ansvar-Systems/US_compliance_MCP/workflows/CodeQL/badge.svg)](https://github.com/Ansvar-Systems/US_compliance_MCP/actions/workflows/codeql.yml)
[![Security](https://github.com/Ansvar-Systems/US_compliance_MCP/workflows/Semgrep/badge.svg)](https://github.com/Ansvar-Systems/US_compliance_MCP/security)
```

**Step 2: Add security section**

After the "Quick Start" section (~line 73), add:

```markdown
---

## Security & Compliance

This MCP server follows **OpenSSF Best Practices** for secure open source development:

- ✅ **Automated Security Scanning**
  - CodeQL (semantic code analysis)
  - Semgrep (SAST security rules)
  - Trivy (vulnerability scanning)
  - Gitleaks (secret detection)
  - Socket Security (supply chain monitoring)

- ✅ **Daily Freshness Monitoring**
  - Automated checks for regulation updates from official sources
  - Auto-generates PRs when changes detected

- ✅ **Secure Publishing**
  - npm provenance attestation (signed packages)
  - MCP Registry cryptographic signing
  - Azure Key Vault for secret management

- ✅ **Security Metrics**
  - OpenSSF Scorecard weekly evaluation
  - GitHub Security tab for vulnerability tracking

**Report security issues:** See [SECURITY.md](SECURITY.md)
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add security badges and compliance section

- OpenSSF Scorecard badge
- CodeQL and Semgrep workflow badges
- Security practices summary
- Link to SECURITY.md policy"
```

---

## Task 13: Final Testing & Validation

**Files:**
- Test all workflows locally where possible

**Step 1: Validate workflow YAML syntax**

Run:
```bash
cd ~/Projects/US_Compliance_MCP/.worktrees/feature/cicd-security-setup

# Install actionlint if not present
brew install actionlint

# Validate all workflows
actionlint .github/workflows/*.yml
```

Expected: No errors

**Step 2: Test build still works**

Run: `npm run build`
Expected: Clean TypeScript compilation

**Step 3: Test full test suite**

Run: `npm test`
Expected: 22 passed, 0 failed

**Step 4: Verify all workflow files created**

Run:
```bash
ls -1 .github/workflows/
```

Expected output:
```
check-regulation-updates.yml
codeql.yml
gitleaks.yml
ossf-scorecard.yml
publish.yml
semgrep.yml
socket-security.yml
test.yml
trivy.yml
```

**Step 5: Commit validation results**

```bash
git add -A
git commit -m "test: validate all workflows and configurations

- actionlint passes on all YAML files
- Build completes successfully
- Full test suite passes (22 tests)
- All 9 workflow files created"
```

---

## Task 14: Merge to Main

**Files:**
- Merge feature branch to main

**Step 1: Push feature branch**

Run:
```bash
git push -u origin feature/cicd-security-setup
```

**Step 2: Create pull request**

Run:
```bash
gh pr create \
  --title "ci: comprehensive CI/CD and security setup" \
  --body "$(cat <<'EOF'
## Summary

Complete CI/CD pipeline with security scanning for US Compliance MCP.

### Workflows Added (9 files)

✅ **CI/CD:**
- `test.yml` - Automated testing + security audit
- `publish.yml` - npm + MCP Registry publishing
- `check-regulation-updates.yml` - Daily update monitoring (enhanced)

✅ **Security Scanning:**
- `codeql.yml` - Semantic code analysis
- `gitleaks.yml` - Secret detection
- `semgrep.yml` - SAST security rules
- `trivy.yml` - Vulnerability scanning
- `socket-security.yml` - Supply chain monitoring
- `ossf-scorecard.yml` - Security metrics

### Documentation Added

- `SECURITY.md` - Vulnerability disclosure policy
- `.github/SECURITY-SETUP.md` - GitHub secrets configuration guide
- Updated `README.md` with security badges and compliance section

### Architecture

- Mirrors proven EU Compliance MCP workflows (production-tested on 47 regulations)
- Adapted for US-specific sources (eCFR, regulations.gov, state sites)
- Azure Key Vault for secret management (shared with EU MCP)
- Automated regulation updates with PR workflow

### Testing

- ✅ actionlint validation passes
- ✅ TypeScript build successful
- ✅ Full test suite passes (22 tests)
- ✅ All 9 workflows validated

### Security Posture

This brings US Compliance MCP to the same security standard as EU Compliance MCP:
- 6 automated security scanning tools
- Daily update monitoring
- Signed npm packages (provenance)
- Cryptographically signed MCP Registry entries
- OpenSSF Scorecard tracking

### Next Steps

After merge:
1. Configure GitHub secrets (`NPM_TOKEN`, `AZURE_CREDENTIALS`)
2. Test publishing workflow with pre-release version
3. Monitor first automated update check
4. Add OpenSSF Scorecard badge to README once available

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Wait for CI checks**

The test workflow will run automatically on the PR. Expected:
- ✅ Tests pass
- ✅ Security audit clean (or only moderate issues)

**Step 4: Merge PR**

Run:
```bash
gh pr merge --squash --auto
```

**Step 5: Return to main worktree**

Run:
```bash
cd ~/Projects/US_Compliance_MCP
git pull origin main
```

**Step 6: Clean up worktree**

Use @superpowers:finishing-a-development-branch skill to properly clean up the worktree.

---

## Success Criteria

- ✅ All 9 GitHub Actions workflows created
- ✅ Security scanning configured (CodeQL, Gitleaks, Semgrep, Trivy, Socket, OSSF)
- ✅ Automated testing on push/PR
- ✅ npm + MCP Registry publishing workflow
- ✅ Daily regulation update monitoring
- ✅ SECURITY.md and setup documentation
- ✅ README updated with security badges
- ✅ All tests passing
- ✅ actionlint validation clean
- ✅ Merged to main branch

## Post-Deployment Tasks

**Manual Steps Required (Not in This Plan):**

1. **Configure GitHub Secrets**
   - Add `NPM_TOKEN` from npm
   - Add `AZURE_CREDENTIALS` for Key Vault access
   - See `.github/SECURITY-SETUP.md` for instructions

2. **Test Publishing Workflow**
   - Create test tag: `git tag v1.2.1-test && git push origin v1.2.1-test`
   - Monitor publish workflow
   - Verify npm package published
   - Verify MCP Registry entry

3. **Monitor First Update Check**
   - Wait for first daily run (6 AM UTC)
   - Verify all 15 regulation sources checked
   - Confirm issue/PR creation if updates found

4. **Add Security Badges**
   - Wait for first OSSF Scorecard run
   - Update README with actual scorecard badge URL

## References

- EU Compliance MCP workflows: `/Users/jeffreyvonrotz/Projects/EU_compliance_MCP/.github/workflows/`
- Design document: `docs/plans/2026-01-29-cicd-security-setup-design.md`
- OpenSSF Best Practices: https://bestpractices.coreinfrastructure.org/
- GitHub Actions Security: https://docs.github.com/en/actions/security-guides
- npm Provenance: https://docs.npmjs.com/generating-provenance-statements
