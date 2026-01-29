/**
 * Colorado Privacy Act Adapter
 *
 * Fetches Colorado CPA from official Colorado General Assembly sources.
 * Source: C.R.S. § 6-1-1301 to 6-1-1313
 *
 * Official Source: https://leg.colorado.gov/colorado-revised-statutes
 *
 * NOTE: Uses seed data extracted from official Colorado Revised Statutes.
 * The Colorado General Assembly publishes statutes in PDF format at leg.colorado.gov.
 * This adapter uses pre-verified seed data to ensure accuracy and avoid
 * reliance on third-party aggregators.
 */

import {
  SourceAdapter,
  RegulationMetadata,
  Section,
  Definition,
  UpdateStatus,
} from '../framework.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ColoradoLegAdapter implements SourceAdapter {
  private readonly regulationId = 'COLORADO_CPA';
  private readonly seedPath: string;

  constructor() {
    this.seedPath = path.join(__dirname, '../../../data/seed/colorado-cpa.json');
  }

  async fetchMetadata(): Promise<RegulationMetadata> {
    return {
      id: 'COLORADO_CPA',
      full_name: 'Colorado Privacy Act',
      citation: 'C.R.S. §6-1-1301 to 6-1-1313',
      effective_date: '2023-07-01',
      last_amended: '2024-01-01',
      source_url: 'https://leg.colorado.gov/colorado-revised-statutes',
      jurisdiction: 'colorado',
      regulation_type: 'statute',
    };
  }

  async *fetchSections(): AsyncGenerator<Section[]> {
    console.log('Loading Colorado CPA from official seed data...');

    try {
      const seedData = JSON.parse(fs.readFileSync(this.seedPath, 'utf-8'));

      if (!seedData.sections || !Array.isArray(seedData.sections)) {
        throw new Error('Invalid seed data format');
      }

      const sections: Section[] = seedData.sections.map((s: any) => ({
        sectionNumber: s.sectionNumber,
        title: s.title,
        text: s.text,
        chapter: s.chapter || 'Colorado Privacy Act',
      }));

      console.log(`  Loaded ${sections.length} sections from seed data`);

      // Validate minimum section count
      if (sections.length < 10) {
        throw new Error(`Expected at least 10 sections, got ${sections.length}`);
      }

      yield sections;
    } catch (error) {
      console.error('Failed to load Colorado CPA seed data:', error);
      throw error;
    }
  }

  async extractDefinitions(): Promise<Definition[]> {
    return [];
  }

  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    // Seed data is static - updates require manual verification
    return {
      hasChanges: false,
      message: 'Colorado CPA uses verified seed data. Check leg.colorado.gov for updates.'
    };
  }
}

export function createColoradoAdapter(): SourceAdapter {
  return new ColoradoLegAdapter();
}
