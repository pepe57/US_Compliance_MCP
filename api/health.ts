import type { VercelRequest, VercelResponse } from '@vercel/node';
import Database from '@ansvar/mcp-sqlite';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const SOURCE_DB = process.env.US_COMPLIANCE_DB_PATH
  || join(process.cwd(), 'data', 'regulations.db');
const TMP_DB = '/tmp/regulations.db';

const PKG_PATH = join(process.cwd(), 'package.json');
const pkgVersion: string = (() => {
  try { return JSON.parse(readFileSync(PKG_PATH, 'utf-8')).version; }
  catch { return '0.0.0'; }
})();

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const dbPath = existsSync(TMP_DB) ? TMP_DB : SOURCE_DB;
  const dbExists = existsSync(dbPath);

  let status: 'ok' | 'degraded' | 'error' = 'ok';
  let regulationCount = 0;
  let sectionCount = 0;

  if (!dbExists) {
    status = 'error';
  } else {
    try {
      const db = new Database(dbPath, { readonly: true });
      const regRow = db.prepare('SELECT COUNT(*) as count FROM regulations').get() as { count: number };
      const secRow = db.prepare('SELECT COUNT(*) as count FROM sections').get() as { count: number };
      regulationCount = regRow.count;
      sectionCount = secRow.count;
      db.close();

      if (regulationCount === 0) {
        status = 'degraded';
      }
    } catch {
      status = 'degraded';
    }
  }

  const statusCode = status === 'error' ? 503 : 200;
  res.status(statusCode).json({
    status,
    server: 'us-regulations-mcp',
    version: pkgVersion,
    database: {
      exists: dbExists,
      regulations: regulationCount,
      sections: sectionCount,
    },
    timestamp: new Date().toISOString(),
  });
}
