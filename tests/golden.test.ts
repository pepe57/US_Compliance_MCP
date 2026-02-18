/**
 * Golden Contract Tests
 *
 * These tests verify data accuracy against known-good values from
 * fixtures/golden-tests.json and fixtures/golden-hashes.json.
 *
 * If these tests fail after a database rebuild, it means either:
 * 1. A seed file was modified (intentional? update golden files)
 * 2. The ingestion pipeline changed behavior (investigate)
 * 3. An upstream source changed (verify against official publications)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

import { searchRegulations } from '../src/tools/search.js';
import { getSection } from '../src/tools/section.js';
import { listRegulations } from '../src/tools/list.js';
import { mapControls } from '../src/tools/map.js';
import { getBreachNotificationTimeline } from '../src/tools/breach-notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const goldenTests = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'golden-tests.json'), 'utf-8')
);
const goldenHashes = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'golden-hashes.json'), 'utf-8')
);

let db: InstanceType<typeof Database>;

beforeAll(() => {
  const dbPath = join(__dirname, '..', 'data', 'regulations.db');
  db = new Database(dbPath, { readonly: true });
});

afterAll(() => {
  db.close();
});

// ──────────────────────────────────────────────
// Database-level drift detection
// ──────────────────────────────────────────────
describe('golden hashes - drift detection', () => {
  it('database has expected table counts', () => {
    for (const [table, expectedCount] of Object.entries(goldenHashes.table_counts)) {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      expect(row.count, `Table ${table} count mismatch`).toBe(expectedCount);
    }
  });

  it('database contains all expected regulation IDs', () => {
    const rows = db.prepare('SELECT id FROM regulations ORDER BY id').all() as Array<{ id: string }>;
    const actualIds = rows.map(r => r.id);
    expect(actualIds).toEqual(goldenHashes.regulation_ids);
  });

  it('section counts per regulation match golden values', () => {
    for (const [regId, expectedCount] of Object.entries(goldenHashes.section_counts_by_regulation)) {
      const row = db.prepare(
        'SELECT COUNT(*) as count FROM sections WHERE regulation = ?'
      ).get(regId) as { count: number };
      expect(row.count, `Section count for ${regId} mismatch`).toBe(expectedCount);
    }
  });
});

// ──────────────────────────────────────────────
// Golden contract tests from fixtures
// ──────────────────────────────────────────────
describe('golden contract tests - data accuracy', () => {
  // Helper to resolve a nested field path like "structure.regulation.id"
  function getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => o?.[key], obj);
  }

  for (const test of goldenTests.tests) {
    it(`[${test.id}] ${test.description}`, async () => {
      const { tool, input, assert: assertion } = test;

      // Handle tests that expect errors
      if (assertion.throws) {
        let threw = false;
        let errorMessage = '';
        try {
          await getToolResult(tool, input);
        } catch (e) {
          threw = true;
          errorMessage = e instanceof Error ? e.message : String(e);
        }
        expect(threw, `Expected ${tool} to throw`).toBe(true);
        if (assertion.error_contains) {
          expect(errorMessage).toContain(assertion.error_contains);
        }
        return;
      }

      // Execute the tool
      const result = await getToolResult(tool, input);

      // Check exact equality
      if (assertion.equals !== undefined) {
        const actual = getNestedField(result, assertion.field);
        expect(actual, `Field ${assertion.field}`).toBe(assertion.equals);
      }

      // Check contains (substring match)
      if (assertion.contains !== undefined) {
        const actual = getNestedField(result, assertion.field);
        expect(actual, `Field ${assertion.field}`).toContain(assertion.contains);
      }

      // Check minimum length (string or array)
      if (assertion.min_length !== undefined) {
        const actual = getNestedField(result, assertion.field);
        expect(actual?.length ?? 0, `Field ${assertion.field} min_length`).toBeGreaterThanOrEqual(
          assertion.min_length
        );
      }

      // Check minimum numeric value
      if (assertion.min_value !== undefined) {
        const actual = getNestedField(result, assertion.field);
        expect(actual, `Field ${assertion.field} min_value`).toBeGreaterThanOrEqual(assertion.min_value);
      }

      // Check that any result in an array has a specific field value
      if (assertion.any_result_has !== undefined) {
        const results = getNestedField(result, assertion.field);
        expect(Array.isArray(results), `Field ${assertion.field} should be array`).toBe(true);
        for (const [key, value] of Object.entries(assertion.any_result_has)) {
          const match = results.some((r: any) => r[key] === value);
          expect(match, `No result has ${key}=${value}`).toBe(true);
        }
      }
    });
  }

  // Tool dispatch helper
  async function getToolResult(tool: string, input: any): Promise<any> {
    switch (tool) {
      case 'get_section':
        return await getSection(db, input);
      case 'search_regulations':
        return await searchRegulations(db, input);
      case 'list_regulations':
        return await listRegulations(db, input);
      case 'map_controls':
        return await mapControls(db, input);
      case 'get_breach_notification_timeline':
        return await getBreachNotificationTimeline(db, input);
      default:
        throw new Error(`Unknown tool in golden tests: ${tool}`);
    }
  }
});
