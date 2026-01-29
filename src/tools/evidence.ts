import type { Database } from 'better-sqlite3';

export interface EvidenceInput {
  regulation: string;
  section: string;
}

export interface EvidenceRequirement {
  evidence_type: string;
  description: string;
  required: boolean;
}

export interface EvidenceResult {
  regulation: string;
  section: string;
  evidence_requirements: EvidenceRequirement[];
  notes: string;
}

/**
 * Get evidence requirements for compliance with a specific section.
 * MVP: Returns placeholder until evidence data is seeded.
 * Future: Will query evidence_requirements table.
 */
export async function getEvidenceRequirements(
  db: Database,
  input: EvidenceInput
): Promise<EvidenceResult> {
  const { regulation, section } = input;

  if (!regulation || !section) {
    throw new Error('Both regulation and section are required');
  }

  // Verify section exists
  const sectionExists = db
    .prepare('SELECT 1 FROM sections WHERE regulation = ? AND section_number = ?')
    .get(regulation, section);

  if (!sectionExists) {
    throw new Error(`Section ${section} not found in regulation ${regulation}`);
  }

  // MVP: Return empty array with note about future implementation
  // In production, this would query an evidence_requirements table
  return {
    regulation,
    section,
    evidence_requirements: [],
    notes: 'Evidence requirements data not yet available. This feature will be implemented in a future release with specific audit artifacts, policies, and procedures required for compliance.',
  };
}
