#!/usr/bin/env npx tsx

/**
 * Test remaining MCP tools
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getEvidenceRequirements } from '../src/tools/evidence.js';
import { getComplianceActionItems } from '../src/tools/action-items.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');

const db = new Database(DB_PATH, { readonly: true });

async function testRemainingTools() {
  console.log('🧪 Testing Remaining MCP Tools\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Get Evidence Requirements
  console.log('1️⃣  Testing get_evidence_requirements...');
  try {
    const result = await getEvidenceRequirements(db, {
      regulation: 'HIPAA',
      section: '164.308'
    });
    if (result && result.section) {
      console.log(`   ✅ Retrieved evidence requirements for ${result.section}`);
      console.log(`   📋 Requirements count: ${result.requirements?.length || 0}`);
      if (result.requirements && result.requirements.length > 0) {
        console.log(`   📝 Sample: ${result.requirements[0].category}`);
      }
      passed++;
    } else {
      console.log(`   ❌ No evidence requirements returned`);
      failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    failed++;
  }

  // Test 2: Get Compliance Action Items
  console.log('\n2️⃣  Testing get_compliance_action_items...');
  try {
    const result = await getComplianceActionItems(db, {
      regulation: 'HIPAA',
      sections: ['164.312', '164.308']
    });
    if (result && result.action_items) {
      console.log(`   ✅ Retrieved ${result.action_items.length} action items`);
      if (result.action_items.length > 0) {
        console.log(`   📝 Sample: ${result.action_items[0].title}`);
        console.log(`   🎯 Priority: ${result.action_items[0].priority}`);
      }
      passed++;
    } else {
      console.log(`   ❌ No action items returned`);
      failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    failed++;
  }

  // Test 3: Test with non-existent section
  console.log('\n3️⃣  Testing with non-existent section...');
  try {
    const result = await getEvidenceRequirements(db, {
      regulation: 'HIPAA',
      section: '999.999'
    });
    console.log(`   ✅ Handled non-existent section gracefully`);
    passed++;
  } catch (error: any) {
    if (error.message.includes('not found')) {
      console.log(`   ✅ Correctly returned error for non-existent section`);
      passed++;
    } else {
      console.log(`   ❌ Unexpected error: ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('🎉 All remaining tools tested successfully!\n');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.\n');
    process.exit(1);
  }

  db.close();
}

testRemainingTools().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
