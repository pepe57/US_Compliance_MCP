import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { searchRegulations, SearchInput } from './search.js';
import { getSection, GetSectionInput } from './section.js';
import { listRegulations, ListInput } from './list.js';
import { compareRequirements, CompareInput } from './compare.js';
import { mapControls, MapControlsInput } from './map.js';
import { checkApplicability, ApplicabilityInput } from './applicability.js';
import { getDefinitions, DefinitionsInput } from './definitions.js';
import { getEvidenceRequirements, EvidenceInput } from './evidence.js';
import { getComplianceActionItems, ActionItemsInput } from './action-items.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (db: Database.Database, args: any) => Promise<any>;
}

/**
 * Centralized registry of all MCP tools.
 * Single source of truth for both stdio and HTTP servers.
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: 'search_regulations',
    description: 'Search across all US regulations using full-text search. Returns relevant sections with highlighted snippets. Token-efficient: returns 32-token snippets with >>> <<< markers around matched terms.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (supports natural language and technical terms)',
        },
        regulations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Filter results to specific regulations (e.g., ["HIPAA", "CCPA"])',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10, max: 1000)',
          default: 10,
        },
      },
      required: ['query'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await searchRegulations(db, args as SearchInput);
    },
  },
  {
    name: 'get_section',
    description: 'Retrieve the full text of a specific regulation section. Returns section content, metadata, and cross-references. Large sections are automatically truncated with a warning.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA")',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.502", "1798.100")',
        },
      },
      required: ['regulation', 'section'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await getSection(db, args as GetSectionInput);
    },
  },
  {
    name: 'list_regulations',
    description: 'List all available regulations or get the structure of a specific regulation. Without parameters, returns all regulations with metadata. With a regulation ID, returns chapters and sections organized hierarchically.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Optional: Regulation ID to get detailed structure for (e.g., "HIPAA")',
        },
      },
    },
    handler: async (db: Database.Database, args: any) => {
      return await listRegulations(db, args as ListInput);
    },
  },
  {
    name: 'compare_requirements',
    description: 'Compare requirements across multiple regulations for a specific topic. Searches each regulation and returns the top matching sections with relevance scores.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic to compare (e.g., "breach notification", "access controls")',
        },
        regulations: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of regulations to compare (e.g., ["HIPAA", "CCPA"])',
        },
      },
      required: ['topic', 'regulations'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await compareRequirements(db, args as CompareInput);
    },
  },
  {
    name: 'map_controls',
    description: 'Map NIST controls (800-53, CSF) to regulation sections. Shows which regulatory requirements satisfy specific control objectives. Can filter by control ID or regulation.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          description: 'Control framework (e.g., "NIST_CSF", "NIST_800_53", "ISO27001")',
        },
        control: {
          type: 'string',
          description: 'Optional: Specific control ID (e.g., "AC-1", "PR.AC-1")',
        },
        regulation: {
          type: 'string',
          description: 'Optional: Filter to specific regulation (e.g., "HIPAA")',
        },
      },
      required: ['framework'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await mapControls(db, args as MapControlsInput);
    },
  },
  {
    name: 'check_applicability',
    description: 'Determine which regulations apply to a specific sector or subsector. Returns applicable regulations with confidence levels (definite, likely, possible).',
    inputSchema: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          description: 'Industry sector (e.g., "healthcare", "financial", "retail", "technology")',
        },
        subsector: {
          type: 'string',
          description: 'Optional: Specific subsector (e.g., "hospital", "bank", "e-commerce")',
        },
      },
      required: ['sector'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await checkApplicability(db, args as ApplicabilityInput);
    },
  },
  {
    name: 'get_definitions',
    description: 'Look up official term definitions across regulations. Uses partial matching to find terms (e.g., "health" matches "protected health information").',
    inputSchema: {
      type: 'object',
      properties: {
        term: {
          type: 'string',
          description: 'Term to look up (e.g., "protected health information", "personal data")',
        },
        regulation: {
          type: 'string',
          description: 'Optional: Filter to specific regulation (e.g., "HIPAA")',
        },
      },
      required: ['term'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await getDefinitions(db, args as DefinitionsInput);
    },
  },
  {
    name: 'get_evidence_requirements',
    description: 'Get compliance evidence requirements for a specific section (e.g., audit logs, policies, procedures). MVP: Returns placeholder until evidence data is seeded.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA")',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.312(b)")',
        },
      },
      required: ['regulation', 'section'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await getEvidenceRequirements(db, args as EvidenceInput);
    },
  },
  {
    name: 'get_compliance_action_items',
    description: 'Generate structured compliance action items from regulation sections. Extracts priority (high/medium/low) based on regulatory language and identifies evidence needed.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA")',
        },
        sections: {
          type: 'array',
          items: { type: 'string' },
          description: 'Section numbers to generate action items for (e.g., ["164.308(a)(1)(ii)(A)", "164.312(b)"])',
        },
      },
      required: ['regulation', 'sections'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await getComplianceActionItems(db, args as ActionItemsInput);
    },
  },
];

/**
 * Register all tools with an MCP server instance.
 * Use this for both stdio and HTTP servers to ensure parity.
 */
export function registerTools(server: Server, db: Database.Database): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = TOOLS.find(t => t.name === name);

    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(db, args || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });
}
