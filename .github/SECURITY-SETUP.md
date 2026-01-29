# GitHub Actions Security Setup

This document explains how to configure GitHub Actions secrets for the US Regulations MCP CI/CD pipeline.

## Required Secrets

| Secret Name | Purpose | Used By |
|------------|---------|---------|
| `NPM_TOKEN` | Publish to npm registry | `publish.yml` |
| `AZURE_CREDENTIALS` | Access Azure Key Vault for MCP Registry signing | `publish.yml` |

## 1. NPM_TOKEN Setup

### Create npm Access Token

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Click your profile → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** scope
5. Copy the token (starts with `npm_`)

### Add to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the npm token
6. Click **Add secret**

### Security Notes

- **Never commit** this token to the repository
- **Never log** this token in workflow outputs
- **Rotate regularly** (npm allows generating new tokens and revoking old ones)
- Use **Automation scope** (not Classic or Publish)

---

## 2. AZURE_CREDENTIALS Setup

### Prerequisites

- Azure subscription
- Key Vault: `kv-ansvar-dev` (shared with EU Compliance MCP)
- MCP publisher private key stored in vault

### Create Azure Service Principal

```bash
# Create service principal with contributor role
az ad sp create-for-rbac \
  --name "github-us-compliance-mcp" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

This outputs JSON like:
```json
{
  "clientId": "<GUID>",
  "clientSecret": "<SECRET>",
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

### Grant Key Vault Access

```bash
# Get the service principal's object ID
SP_OBJECT_ID=$(az ad sp show --id <clientId> --query id -o tsv)

# Grant "Key Vault Secrets User" role
az role assignment create \
  --assignee-object-id $SP_OBJECT_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.KeyVault/vaults/kv-ansvar-dev
```

### Add to GitHub Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `AZURE_CREDENTIALS`
4. Value: Paste the entire JSON output from `az ad sp create-for-rbac`
5. Click **Add secret**

### Verify Access

Test the service principal can read the secret:

```bash
# Login with service principal
az login --service-principal \
  -u <clientId> \
  -p <clientSecret> \
  --tenant <tenantId>

# Try to read the MCP publisher key
az keyvault secret show \
  --vault-name kv-ansvar-dev \
  --name mcp-publisher-private-key \
  --query value -o tsv
```

If successful, the workflow will be able to retrieve the signing key.

---

## Azure Key Vault Structure

### Vault: `kv-ansvar-dev`

```
kv-ansvar-dev/
└── Secrets
    └── mcp-publisher-private-key
        ├── Description: Private key for MCP Registry DNS-based authentication
        ├── Used by: EU Compliance MCP & US Compliance MCP
        ├── Format: PEM-encoded private key
        └── Corresponds to: DNS TXT record at ansvar.eu
```

### Why Shared Key?

Both US and EU Compliance MCP projects are published under the same domain (`ansvar.eu`), so they share the same MCP Registry publisher identity. This means:

- **One DNS TXT record** at `_mcp-publisher.ansvar.eu`
- **One private key** in Azure Key Vault
- **Two GitHub repositories** both use the same key for signing

### Key Vault Access Control

| Role | Permissions | Who Has It |
|------|-------------|-----------|
| Key Vault Administrator | Full management | Ansvar Systems admins |
| Key Vault Secrets User | Read secrets | GitHub Actions service principals |

---

## Key Rotation Procedure

### When to Rotate

- Every 90 days (recommended)
- If key is compromised
- When team members with access leave
- After security incidents

### How to Rotate

#### 1. Generate New Keypair

```bash
# Generate new private key
openssl genpkey -algorithm RSA -out new-private.pem -pkeyopt rsa_keygen_bits:4096

# Extract public key
openssl rsa -in new-private.pem -pubout -out new-public.pem

# Get public key hash for DNS
mcp-publisher dns-hash new-public.pem
```

#### 2. Update DNS TXT Record

Update `_mcp-publisher.ansvar.eu` TXT record with new hash:

```
_mcp-publisher.ansvar.eu.  IN  TXT  "v=mcp1; h=<new-hash>"
```

Wait for DNS propagation (check with `dig TXT _mcp-publisher.ansvar.eu`).

#### 3. Update Key Vault

```bash
# Upload new private key to Key Vault
az keyvault secret set \
  --vault-name kv-ansvar-dev \
  --name mcp-publisher-private-key \
  --file new-private.pem
```

#### 4. Test Publishing

Manually trigger `publish.yml` on a test branch to verify:
- Azure login works
- Key retrieval from vault succeeds
- MCP Registry authentication succeeds

#### 5. Clean Up

```bash
# Securely delete old key files
shred -u new-private.pem new-public.pem
```

---

## Troubleshooting

### "Authentication failed" during Azure login

**Symptom:** `az login` fails in workflow

**Possible causes:**
- Service principal credentials expired
- JSON in `AZURE_CREDENTIALS` malformed
- Service principal was deleted

**Solution:**
```bash
# Verify service principal exists
az ad sp show --id <clientId>

# Test login locally
az login --service-principal -u <clientId> -p <clientSecret> --tenant <tenantId>
```

### "Secret not found" in Key Vault

**Symptom:** `az keyvault secret show` returns 404

**Possible causes:**
- Secret name typo (`mcp-publisher-private-key`)
- Service principal lacks permissions
- Wrong vault name

**Solution:**
```bash
# List all secrets in vault
az keyvault secret list --vault-name kv-ansvar-dev

# Check service principal permissions
az role assignment list \
  --assignee <clientId> \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.KeyVault/vaults/kv-ansvar-dev
```

### "Failed to publish to MCP Registry"

**Symptom:** `mcp-publisher publish` fails

**Possible causes:**
- DNS TXT record doesn't match private key
- Private key format incorrect (must be PEM)
- `server.json` validation errors

**Solution:**
```bash
# Verify DNS record
dig TXT _mcp-publisher.ansvar.eu

# Test authentication locally
mcp-publisher login dns -domain ansvar.eu -private-key "$PRIVATE_KEY"

# Validate server.json
mcp-publisher validate
```

### "npm publish permission denied"

**Symptom:** `npm publish` fails with 403

**Possible causes:**
- `NPM_TOKEN` invalid or expired
- Package name already taken
- Not authorized to publish under `@ansvar` scope

**Solution:**
```bash
# Verify token works locally
export NPM_TOKEN=<your-token>
npm whoami --registry https://registry.npmjs.org

# Check package ownership
npm owner ls @ansvar/us-regulations-mcp
```

---

## Security Best Practices

### Secret Hygiene

1. **Never commit secrets** to the repository (use `.gitignore` for local test files)
2. **Use `::add-mask::`** in workflows to prevent accidental logging
3. **Rotate regularly** even if not compromised
4. **Audit access** to GitHub secrets and Key Vault

### Workflow Security

1. **Pin action versions** (e.g., `actions/checkout@v4`, not `@main`)
2. **Minimal permissions** (use `permissions:` block)
3. **Avoid command injection** (never interpolate untrusted input)
4. **Review dependencies** (check new workflow actions)

### Incident Response

If a secret is compromised:

1. **Immediately revoke** the token/key in the source system
2. **Rotate** to a new secret
3. **Update GitHub secret** with new value
4. **Review logs** for unauthorized use
5. **Document** the incident for audit trail

---

**Last Updated:** 2026-01-29
**Maintainer:** Ansvar Systems (hello@ansvar.eu)
