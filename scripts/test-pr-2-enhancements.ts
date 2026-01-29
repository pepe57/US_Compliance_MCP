#!/usr/bin/env npx tsx

/**
 * PR #2 Enhancement Tests
 *
 * Tests for the regulatory coverage expansion and source transparency enhancements
 * introduced in PR #2:
 * - Colorado CPA seed data (13 sections)
 * - SOX expansion (15 sections vs. previous 5)
 * - FFIEC IT Handbook (14 sections)
 * - NYDFS 500 update (17 sections)
 * - Source metadata validation
 * - Control mapping disclaimers
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');
const SEED_DIR = join(__dirname, '..', 'data', 'seed');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((error: Error) => {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`❌ ${name}: ${message}`);
    failed++;
  }
}

console.log('\n🔍 PR #2 Enhancement Validation Tests\n');
console.log('=' .repeat(70));

const db = Database(DB_PATH, { readonly: true });

// Test 1: Colorado CPA Section Count
console.log('\n📂 COLORADO CPA VALIDATION');
console.log('-'.repeat(70));

test('Colorado CPA has exactly 13 sections', () => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sections WHERE regulation = 'COLORADO_CPA'
  `).get() as { count: number };

  if (result.count !== 13) {
    throw new Error(`Expected 13 sections, got ${result.count}`);
  }
  console.log(`   Found ${result.count} sections`);
});

test('Colorado CPA includes all key sections (6-1-1301 to 6-1-1313)', () => {
  const sections = db.prepare(`
    SELECT section_number FROM sections
    WHERE regulation = 'COLORADO_CPA'
    ORDER BY section_number
  `).all() as Array<{ section_number: string }>;

  const expected = [
    '6-1-1301', '6-1-1302', '6-1-1303', '6-1-1304', '6-1-1305',
    '6-1-1306', '6-1-1307', '6-1-1308', '6-1-1309', '6-1-1310',
    '6-1-1311', '6-1-1312', '6-1-1313'
  ];

  sections.forEach((s, idx) => {
    if (s.section_number !== expected[idx]) {
      throw new Error(`Section ${idx} mismatch: expected ${expected[idx]}, got ${s.section_number}`);
    }
  });

  console.log(`   All 13 sections present and correctly numbered`);
});

test('Colorado CPA seed file has source metadata', () => {
  const seedData = JSON.parse(readFileSync(join(SEED_DIR, 'colorado-cpa.json'), 'utf-8'));

  if (!seedData.source) {
    throw new Error('Missing source object');
  }

  if (!seedData.source.official_url) {
    throw new Error('Missing official_url');
  }

  if (!seedData.source.last_verified) {
    throw new Error('Missing last_verified date');
  }

  if (!seedData.source.disclaimer) {
    throw new Error('Missing disclaimer');
  }

  console.log(`   Source: ${seedData.source.official_url}`);
  console.log(`   Verified: ${seedData.source.last_verified}`);
});

// Test 2: SOX Expansion
console.log('\n📂 SOX EXPANSION VALIDATION');
console.log('-'.repeat(70));

test('SOX has exactly 15 sections (expanded from 5)', () => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sections WHERE regulation = 'SOX'
  `).get() as { count: number };

  if (result.count !== 15) {
    throw new Error(`Expected 15 sections, got ${result.count}`);
  }
  console.log(`   Found ${result.count} sections (5x expansion)`);
});

test('SOX includes statutory sections (101, 201, 301, 302, 404, etc.)', () => {
  const sections = db.prepare(`
    SELECT section_number, title FROM sections
    WHERE regulation = 'SOX'
    AND section_number LIKE 'SOX-%'
  `).all() as Array<{ section_number: string; title: string }>;

  const requiredSections = ['SOX-101', 'SOX-201', 'SOX-301', 'SOX-302', 'SOX-404'];

  requiredSections.forEach(reqSec => {
    const found = sections.find(s => s.section_number === reqSec);
    if (!found) {
      throw new Error(`Missing required section: ${reqSec}`);
    }
  });

  console.log(`   Found ${sections.length} statutory sections`);
});

test('SOX includes SEC implementing regulations', () => {
  const sections = db.prepare(`
    SELECT section_number, title FROM sections
    WHERE regulation = 'SOX'
    AND section_number LIKE '17-CFR-%'
  `).all() as Array<{ section_number: string; title: string }>;

  if (sections.length < 3) {
    throw new Error(`Expected at least 3 SEC regulation sections, got ${sections.length}`);
  }

  console.log(`   Found ${sections.length} SEC regulation sections`);
});

test('SOX includes PCAOB auditing standards', () => {
  const sections = db.prepare(`
    SELECT section_number, title FROM sections
    WHERE regulation = 'SOX'
    AND section_number LIKE 'PCAOB-%'
  `).all() as Array<{ section_number: string; title: string }>;

  if (sections.length < 1) {
    throw new Error('Missing PCAOB auditing standards');
  }

  console.log(`   Found ${sections.length} PCAOB standard sections`);
});

// Test 3: FFIEC IT Handbook
console.log('\n📂 FFIEC IT HANDBOOK VALIDATION');
console.log('-'.repeat(70));

test('FFIEC has exactly 14 sections', () => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sections WHERE regulation = 'FFIEC'
  `).get() as { count: number };

  if (result.count !== 14) {
    throw new Error(`Expected 14 sections, got ${result.count}`);
  }
  console.log(`   Found ${result.count} sections`);
});

test('FFIEC includes key examination areas', () => {
  const sections = db.prepare(`
    SELECT section_number, title FROM sections
    WHERE regulation = 'FFIEC'
  `).all() as Array<{ section_number: string; title: string }>;

  const requiredAreas = ['INFOSEC', 'BCP', 'AUDIT', 'OUTSOURCE', 'CYBER'];

  requiredAreas.forEach(area => {
    const found = sections.find(s => s.section_number.includes(area));
    if (!found) {
      throw new Error(`Missing examination area: ${area}`);
    }
  });

  console.log(`   Found all key examination areas`);
});

test('FFIEC seed file has updated disclaimer', () => {
  const seedData = JSON.parse(readFileSync(join(SEED_DIR, 'ffiec.json'), 'utf-8'));

  if (!seedData.source?.disclaimer) {
    throw new Error('Missing disclaimer');
  }

  if (!seedData.source.disclaimer.includes('examination guidance')) {
    throw new Error('Disclaimer should mention "examination guidance"');
  }

  console.log(`   Disclaimer present and accurate`);
});

// Test 4: NYDFS 500 Update
console.log('\n📂 NYDFS 500 UPDATE VALIDATION');
console.log('-'.repeat(70));

test('NYDFS 500 has exactly 17 sections', () => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sections WHERE regulation = 'NYDFS_500'
  `).get() as { count: number };

  if (result.count !== 17) {
    throw new Error(`Expected 17 sections, got ${result.count}`);
  }
  console.log(`   Found ${result.count} sections`);
});

test('NYDFS 500 includes all sections (500.1 to 500.17)', () => {
  const sections = db.prepare(`
    SELECT section_number FROM sections
    WHERE regulation = 'NYDFS_500'
    ORDER BY CAST(SUBSTR(section_number, 5) AS REAL)
  `).all() as Array<{ section_number: string }>;

  for (let i = 1; i <= 17; i++) {
    const sectionNum = `500.${i}`;
    const found = sections.find(s => s.section_number === sectionNum);
    if (!found) {
      throw new Error(`Missing section ${sectionNum}`);
    }
  }

  console.log(`   All 17 sections present (500.1 - 500.17)`);
});

test('NYDFS seed file reflects 2023 amendments', () => {
  const seedData = JSON.parse(readFileSync(join(SEED_DIR, 'nydfs.json'), 'utf-8'));

  if (!seedData.regulation.last_amended) {
    throw new Error('Missing last_amended date');
  }

  if (!seedData.regulation.last_amended.includes('2023')) {
    throw new Error('Should reflect 2023 amendments');
  }

  console.log(`   Last amended: ${seedData.regulation.last_amended}`);
});

// Test 5: Source Metadata Validation
console.log('\n📂 SOURCE METADATA VALIDATION');
console.log('-'.repeat(70));

test('All seed files have source metadata', () => {
  const seedFiles = ['colorado-cpa.json', 'sox.json', 'ffiec.json', 'nydfs.json'];

  seedFiles.forEach(file => {
    const seedData = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf-8'));

    if (!seedData.source) {
      throw new Error(`${file}: Missing source object`);
    }

    if (!seedData.source.official_url) {
      throw new Error(`${file}: Missing official_url`);
    }

    if (!seedData.source.last_verified) {
      throw new Error(`${file}: Missing last_verified`);
    }
  });

  console.log(`   All 4 seed files have complete source metadata`);
});

test('Source registry tracks all seed data sources', () => {
  const sources = db.prepare(`
    SELECT regulation, source_type, source_url FROM source_registry
    WHERE regulation IN ('COLORADO_CPA', 'SOX', 'FFIEC', 'NYDFS_500')
  `).all() as Array<{ regulation: string; source_type: string; source_url: string }>;

  if (sources.length !== 4) {
    throw new Error(`Expected 4 source registry entries, got ${sources.length}`);
  }

  sources.forEach(src => {
    if (!src.source_url || src.source_url === '') {
      throw new Error(`${src.regulation}: Missing source URL`);
    }
  });

  console.log(`   All 4 regulations tracked in source registry`);
});

// Test 6: Control Mapping Disclaimers
console.log('\n📂 CONTROL MAPPING DISCLAIMERS');
console.log('-'.repeat(70));

test('HIPAA-NIST 800-53 mapping file has disclaimer', () => {
  const mappingData = JSON.parse(
    readFileSync(join(SEED_DIR, 'mappings', 'hipaa-nist-800-53.json'), 'utf-8')
  );

  if (!mappingData.source) {
    throw new Error('Missing source object');
  }

  if (!mappingData.source.disclaimer) {
    throw new Error('Missing disclaimer');
  }

  if (!mappingData.source.disclaimer.includes('NOT official')) {
    throw new Error('Disclaimer should emphasize "NOT official"');
  }

  console.log(`   HIPAA mapping has proper disclaimer`);
});

test('CCPA-NIST CSF mapping file has disclaimer', () => {
  const mappingData = JSON.parse(
    readFileSync(join(SEED_DIR, 'mappings', 'ccpa-nist-csf.json'), 'utf-8')
  );

  if (!mappingData.source) {
    throw new Error('Missing source object');
  }

  if (!mappingData.source.disclaimer) {
    throw new Error('Missing disclaimer');
  }

  if (!mappingData.source.disclaimer.includes('interpretive')) {
    throw new Error('Disclaimer should mention "interpretive"');
  }

  console.log(`   CCPA mapping has proper disclaimer`);
});

// Test 7: Section Count Validation
console.log('\n📂 TOTAL SECTION COUNT VALIDATION');
console.log('-'.repeat(70));

test('Total sections >= 380 (meets PR description)', () => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sections
  `).get() as { count: number };

  if (result.count < 380) {
    throw new Error(`Expected >= 380 sections, got ${result.count}`);
  }

  console.log(`   Total: ${result.count} sections (exceeds 380 target)`);
});

test('All 14 regulations present', () => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM regulations
  `).get() as { count: number };

  if (result.count !== 14) {
    throw new Error(`Expected 14 regulations, got ${result.count}`);
  }

  const regs = db.prepare(`SELECT id FROM regulations ORDER BY id`).all() as Array<{ id: string }>;
  console.log(`   Regulations: ${regs.map(r => r.id).join(', ')}`);
});

// Test 8: Search Functionality
console.log('\n📂 SEARCH FUNCTIONALITY VALIDATION');
console.log('-'.repeat(70));

test('Can search Colorado CPA for privacy-related content', () => {
  const results = db.prepare(`
    SELECT regulation, section_number, title
    FROM sections_fts
    WHERE sections_fts MATCH 'privacy'
    AND regulation = 'COLORADO_CPA'
    LIMIT 5
  `).all() as Array<{ regulation: string; section_number: string; title: string }>;

  if (results.length === 0) {
    throw new Error('No search results for "privacy" in Colorado CPA');
  }

  console.log(`   Found ${results.length} results for "privacy"`);
});

test('Can search SOX for IT control-related content', () => {
  const results = db.prepare(`
    SELECT regulation, section_number, substr(title, 1, 50) as title
    FROM sections_fts
    WHERE sections_fts MATCH 'internal controls'
    AND regulation = 'SOX'
    LIMIT 5
  `).all() as Array<{ regulation: string; section_number: string; title: string }>;

  if (results.length === 0) {
    throw new Error('No search results for "internal controls" in SOX');
  }

  console.log(`   Found ${results.length} results for "internal controls"`);
});

test('Can search FFIEC for cybersecurity content', () => {
  const results = db.prepare(`
    SELECT regulation, section_number, substr(title, 1, 50) as title
    FROM sections_fts
    WHERE sections_fts MATCH 'cybersecurity'
    AND regulation = 'FFIEC'
    LIMIT 5
  `).all() as Array<{ regulation: string; section_number: string; title: string }>;

  if (results.length === 0) {
    throw new Error('No search results for "cybersecurity" in FFIEC');
  }

  console.log(`   Found ${results.length} results for "cybersecurity"`);
});

// Summary
console.log('\n' + '='.repeat(70));
console.log(`📊 PR #2 Enhancement Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

db.close();

if (failed > 0) {
  console.error('\n❌ Some tests failed');
  process.exit(1);
}

console.log('\n✅ All PR #2 enhancements validated successfully!');
process.exit(0);
