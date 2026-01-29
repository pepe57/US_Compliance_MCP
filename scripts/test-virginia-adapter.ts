import { createVirginiaAdapter } from '../src/ingest/adapters/virginia-law.js';

console.log('Testing Virginia CDPA Adapter...\n');

const adapter = createVirginiaAdapter();

// Test metadata
console.log('Testing metadata...');
const metadata = await adapter.fetchMetadata();
console.log('  ✅ ID:', metadata.id);
console.log('  ✅ Full name:', metadata.full_name);
console.log('  ✅ Citation:', metadata.citation);
console.log('  ✅ Jurisdiction:', metadata.jurisdiction);

// Test sections
console.log('\nTesting sections...');
let totalSections = 0;
for await (const batch of adapter.fetchSections()) {
  totalSections += batch.length;
  console.log(`  ✅ Batch fetched: ${batch.length} sections`);

  // Show sample section
  if (batch.length > 0 && totalSections <= batch.length) {
    const sample = batch[0];
    console.log(`  Sample: ${sample.section_number} - ${sample.title}`);
    console.log(`  Text length: ${sample.text.length} chars`);
  }
}

console.log(`\n✅ Total sections: ${totalSections}`);

if (totalSections >= 10) {
  console.log('\n✅ VIRGINIA ADAPTER TEST PASSED');
} else {
  console.log('\n❌ VIRGINIA ADAPTER TEST FAILED: Expected at least 10 sections');
  process.exit(1);
}
