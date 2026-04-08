/**
 * Palace Types — Interfaces for the MemPalace adapter layer
 *
 * These types define the contract between XmetaV-style orchestration
 * and the MemPalace Python memory engine.
 */

// ---- Search Results ----

export interface PalaceHit {
  text: string;
  wing: string;
  room: string;
  source_file: string;
  similarity: number;
}

export interface PalaceSearchResult {
  query: string;
  filters: { wing: string | null; room: string | null };
  results: PalaceHit[];
  error?: string;
}

// ---- AAAK Compression ----

export interface CompressionResult {
  compressed: string;
  stats: {
    original_tokens: number;
    compressed_tokens: number;
    ratio: number;
    original_chars: number;
    compressed_chars: number;
  };
}

// ---- Knowledge Graph ----

export interface KGTriple {
  subject: string;
  predicate: string;
  object: string;
  valid_from: string | null;
  valid_to: string | null;
  confidence: number;
  current: boolean;
}

export interface KGStats {
  entities: number;
  triples: number;
  current_facts: number;
  expired_facts: number;
  relationship_types: string[];
}

// ---- Agent → Wing Mapping ----

/**
 * Maps XmetaV agent IDs to MemPalace wings.
 * When an agent writes a memory, it goes into the corresponding wing.
 * When searching, the agent's wing is used as a filter hint.
 */
export const AGENT_WING_MAP: Record<string, string> = {
  main: "operations",
  sentinel: "operations",
  soul: "memory",
  briefing: "operations",
  oracle: "intelligence",
  alchemist: "tokenomics",
  midas: "revenue",
  web3dev: "technical",
  basedintern: "technical",
  basedintern_web: "technical",
  akua: "technical",
  akua_web: "technical",
};

/** Default wing for unknown agents */
export const DEFAULT_WING = "general";

/** Resolve an agent ID to its palace wing */
export function agentToWing(agentId: string): string {
  return AGENT_WING_MAP[agentId] ?? DEFAULT_WING;
}

// ---- Palace Config ----

export interface PalaceConfig {
  /** Path to the ChromaDB palace directory */
  palacePath: string;
  /** Path to the SQLite knowledge graph */
  kgPath: string;
  /** Python binary to use for subprocess calls */
  pythonBin: string;
  /** Kill switch — disable all palace operations */
  enabled: boolean;
  /** Maximum time (ms) to wait for a subprocess call */
  timeoutMs: number;
  /** Minimum similarity score to include palace results in context */
  minSimilarity: number;
  /** Max palace results to merge into Soul context */
  maxPalaceResults: number;
  /** Threshold: only use palace fallback when Soul returns fewer than this many relevant hits */
  soulFallbackThreshold: number;
}

export const DEFAULT_PALACE_CONFIG: PalaceConfig = {
  palacePath: process.env.PALACE_PATH ?? `${process.env.HOME}/.mempalace/palace`,
  kgPath: process.env.PALACE_KG_PATH ?? `${process.env.HOME}/.mempalace/knowledge_graph.sqlite3`,
  pythonBin: process.env.MEMPALACE_PYTHON ?? "python3",
  enabled: process.env.PALACE_ENABLED !== "false",
  timeoutMs: 5000,
  minSimilarity: 0.3,
  maxPalaceResults: 5,
  soulFallbackThreshold: 5,
};
