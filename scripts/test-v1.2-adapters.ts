#!/usr/bin/env npx tsx

/**
 * Comprehensive v1.2 Adapter Tests
 * Tests all 4 state privacy law adapters
 */

import { createVirginiaAdapter } from '../src/ingest/adapters/virginia-law.js';
import { createColoradoAdapter } from '../src/ingest/adapters/colorado-public.js';
import { createConnecticutAdapter } from '../src/ingest/adapters/connecticut-cga.js';
import { createUtahAdapter } from '../src/ingest/adapters/utah-xcode.js';

async function testAdapter(name: string, adapter: any, minSections: number) {
  console.log(`\n📋 Testing ${name}...`);

  // Test metadata
  console.log('  Testing metadata...');
  const metadata = await adapter.fetchMetadata();
  console.log(`    ✅ ID: ${metadata.id}`);
  console.log(`    ✅ Citation: ${metadata.citation}`);
  console.log(`    ✅ Jurisdiction: ${metadata.jurisdiction}`);
  console.log(`    ✅ Type: ${metadata.regulation_type}`);

  // Test sections
  console.log('  Testing sections...');
  let totalSections = 0;
  for await (const batch of adapter.fetchSections()) {
    totalSections += batch.length;
    console.log(`    ✅ Fetched ${batch.length} sections`);

    // Validate all sections have required fields
    for (const section of batch) {
      if (!section.sectionNumber || !section.text) {
        throw new Error(`Invalid section: ${JSON.stringify(section)}`);
      }
      if (section.text.length < 50) {
        throw new Error(`Section ${section.sectionNumber} text too short: ${section.text.length} chars`);
      }
    }
  }

  console.log(`  Total sections: ${totalSections}`);

  // Sample sections
  if (totalSections > 0) {
    console.log('  Sample sections:');
    const sampleAdapter = name === 'Virginia' ? createVirginiaAdapter() :
                          name === 'Colorado' ? createColoradoAdapter() :
                          name === 'Connecticut' ? createConnecticutAdapter() :
                          createUtahAdapter();

    let count = 0;
    for await (const batch of sampleAdapter.fetchSections()) {
      for (const section of batch.slice(0, 3 - count)) {
        console.log(`    - ${section.sectionNumber}: ${section.title}`);
        count++;
      }
      if (count >= 3) break;
    }
  }

  // Test checkForUpdates
  console.log('  Testing checkForUpdates...');
  const updateStatus = await adapter.checkForUpdates();
  console.log(`    ✅ Update check: hasChanges=${updateStatus.hasChanges}`);

  // Validation
  if (totalSections < minSections) {
    throw new Error(`Expected at least ${minSections} sections, got ${totalSections}`);
  }

  console.log(`\n✅ ${name.toUpperCase()} PASSED`);
  return totalSections;
}

// Run all tests
console.log('============================================================');
console.log('v1.2 State Privacy Laws Adapter Tests');
console.log('============================================================');

try {
  const virginiaSections = await testAdapter('Virginia', createVirginiaAdapter(), 10);
  const coloradoSections = await testAdapter('Colorado', createColoradoAdapter(), 10);
  const connecticutSections = await testAdapter('Connecticut', createConnecticutAdapter(), 8);
  const utahSections = await testAdapter('Utah', createUtahAdapter(), 10);

  const totalSections = virginiaSections + coloradoSections + connecticutSections + utahSections;

  console.log('\n============================================================');
  console.log(`📊 Test Results: 4 adapters passed, ${totalSections} total sections`);
  console.log('============================================================');
  console.log('\n✅ All v1.2 adapter tests passed!');

} catch (error) {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}
