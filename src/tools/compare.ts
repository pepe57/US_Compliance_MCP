import type { Database } from 'better-sqlite3';
import { searchRegulations, SearchResult } from './search.js';

export interface CompareInput {
  topic: string;
  regulations: string[];
}

export interface CompareResult {
  topic: string;
  comparisons: Array<{
    regulation: string;
    matches: SearchResult[];
    total_matches: number;
  }>;
}

/**
 * Compare requirements across multiple regulations for a specific topic.
 * Uses search_regulations internally to find relevant sections in each regulation.
 */
export async function compareRequirements(
  db: Database,
  input: CompareInput
): Promise<CompareResult> {
  const { topic, regulations } = input;

  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic is required');
  }

  if (!regulations || regulations.length === 0) {
    throw new Error('At least one regulation must be specified');
  }

  if (regulations.length > 10) {
    throw new Error('Cannot compare more than 10 regulations at once');
  }

  // Search each regulation independently
  const comparisons = await Promise.all(
    regulations.map(async (regulation) => {
      const results = await searchRegulations(db, {
        query: topic,
        regulations: [regulation],
        limit: 5, // Top 5 matches per regulation
      });

      return {
        regulation,
        matches: results,
        total_matches: results.length,
      };
    })
  );

  return {
    topic,
    comparisons,
  };
}
