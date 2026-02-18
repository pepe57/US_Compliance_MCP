import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import Database from '@ansvar/mcp-sqlite';
import { join } from 'path';
import { existsSync, copyFileSync, readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';

import { registerTools } from '../src/tools/registry.js';
import type { AboutContext } from '../src/tools/about.js';

const SOURCE_DB = process.env.US_COMPLIANCE_DB_PATH
  || join(process.cwd(), 'data', 'regulations.db');
const TMP_DB = '/tmp/regulations.db';

// Read version from package.json at module load time
const PKG_PATH = join(process.cwd(), 'package.json');
const pkgVersion: string = (() => {
  try { return JSON.parse(readFileSync(PKG_PATH, 'utf-8')).version; }
  catch { return '0.0.0'; }
})();

let db: InstanceType<typeof Database> | null = null;
let aboutContext: AboutContext | null = null;

function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    if (!existsSync(TMP_DB)) {
      copyFileSync(SOURCE_DB, TMP_DB);
    }
    db = new Database(TMP_DB, { readonly: true });
  }
  return db;
}

function getAboutContext(): AboutContext {
  if (!aboutContext) {
    const dbPath = existsSync(TMP_DB) ? TMP_DB : SOURCE_DB;
    let fingerprint = 'unknown';
    let dbBuilt = new Date().toISOString();
    try {
      const buf = readFileSync(dbPath);
      fingerprint = createHash('sha256').update(buf).digest('hex').slice(0, 12);
      dbBuilt = statSync(dbPath).mtime.toISOString();
    } catch { /* use defaults */ }
    aboutContext = { version: pkgVersion, fingerprint, dbBuilt };
  }
  return aboutContext;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: 'us-regulations-mcp',
      version: pkgVersion,
      protocol: 'mcp-streamable-http',
    });
    return;
  }

  try {
    if (!existsSync(SOURCE_DB)) {
      res.status(500).json({ error: `Database not found at ${SOURCE_DB}` });
      return;
    }

    const database = getDatabase();
    const context = getAboutContext();

    const server = new Server(
      { name: 'us-regulations-mcp', version: pkgVersion },
      { capabilities: { tools: {} } }
    );

    registerTools(server, database, context);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('MCP handler error:', message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
