/**
 * Palace Adapter — Subprocess bridge to MemPalace Python
 *
 * All calls are non-fatal: if Python fails, the caller gets
 * an empty result and Soul continues with Supabase-only context.
 *
 * Each function spawns a short-lived python3 process that imports
 * mempalace modules, runs one operation, and prints JSON to stdout.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  DEFAULT_PALACE_CONFIG,
  agentToWing,
  type PalaceConfig,
  type PalaceHit,
  type PalaceSearchResult,
  type CompressionResult,
  type KGTriple,
  type KGStats,
} from "./types.js";

const execFileAsync = promisify(execFile);

const config: PalaceConfig = DEFAULT_PALACE_CONFIG;

/**
 * Run a Python snippet and parse its JSON output.
 * Returns null on any failure (timeout, import error, bad JSON).
 */
async function runPython<T>(code: string): Promise<T | null> {
  if (!config.enabled) return null;

  try {
    const { stdout } = await execFileAsync(config.pythonBin, ["-c", code], {
      timeout: config.timeoutMs,
      maxBuffer: 1024 * 1024, // 1MB
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });
    return JSON.parse(stdout.trim()) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only log if it's not a "palace not found" type error
    if (!msg.includes("No palace found") && !msg.includes("ModuleNotFoundError")) {
      console.warn(`[palace] Python subprocess failed:`, msg.slice(0, 200));
    }
    return null;
  }
}

/** Escape a string for safe inclusion in a Python string literal */
function pyEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

// ---- Search ----

/**
 * Semantic search against the MemPalace.
 * Optionally filters by the agent's mapped wing.
 *
 * Returns matching drawers ranked by embedding similarity.
 */
export async function palaceSearch(
  query: string,
  agentId?: string,
  nResults: number = config.maxPalaceResults
): Promise<PalaceHit[]> {
  const wing = agentId ? agentToWing(agentId) : undefined;
  const wingArg = wing ? `, wing='${pyEscape(wing)}'` : "";

  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
from mempalace.searcher import search_memories
result = search_memories(
    '${pyEscape(query)}',
    '${pyEscape(config.palacePath)}',
    n_results=${nResults}${wingArg}
)
print(json.dumps(result))
`.trim();

  const result = await runPython<PalaceSearchResult>(code);
  if (!result || result.error) return [];

  return (result.results ?? []).filter(
    (hit) => hit.similarity >= config.minSimilarity
  );
}

// ---- Store ----

/**
 * Write content into the MemPalace as a new drawer.
 * Routes to the correct wing based on agent ID.
 *
 * This is the dual-write target: Supabase gets the memory,
 * Palace gets an embedded copy for semantic search.
 */
export async function palaceStore(
  agentId: string,
  content: string,
  kind: string,
  source: string = "bridge"
): Promise<boolean> {
  const wing = agentToWing(agentId);
  const timestamp = new Date().toISOString();

  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
import chromadb

palace_path = '${pyEscape(config.palacePath)}'
try:
    client = chromadb.PersistentClient(path=palace_path)
    col = client.get_or_create_collection('mempalace_drawers')
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))
    sys.exit(0)

doc_id = '${pyEscape(agentId)}_${pyEscape(kind)}_' + '${pyEscape(timestamp)}'.replace(':', '-')

col.add(
    documents=['${pyEscape(content)}'],
    metadatas=[{
        'wing': '${pyEscape(wing)}',
        'room': '${pyEscape(kind)}',
        'source_file': '${pyEscape(source)}',
        'agent_id': '${pyEscape(agentId)}',
        'timestamp': '${pyEscape(timestamp)}',
    }],
    ids=[doc_id]
)

print(json.dumps({"ok": True, "id": doc_id}))
`.trim();

  const result = await runPython<{ ok: boolean }>(code);
  return result?.ok ?? false;
}

// ---- AAAK Compression ----

/**
 * Compress text using the AAAK Dialect.
 * Returns the compressed string, or the original text if compression fails.
 */
export async function compressContext(
  text: string,
  metadata?: Record<string, string>
): Promise<string> {
  const metaArg = metadata ? `, metadata=${JSON.stringify(metadata)}` : "";

  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
from mempalace.dialect import Dialect

d = Dialect()
compressed = d.compress('${pyEscape(text)}'${metaArg})
stats = d.compression_stats('${pyEscape(text)}', compressed)
print(json.dumps({"compressed": compressed, "stats": stats}))
`.trim();

  const result = await runPython<CompressionResult>(code);
  return result?.compressed ?? text;
}

/**
 * Compress with full stats returned.
 */
export async function compressWithStats(
  text: string,
  metadata?: Record<string, string>
): Promise<CompressionResult | null> {
  const metaArg = metadata ? `, metadata=${JSON.stringify(metadata)}` : "";

  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
from mempalace.dialect import Dialect

d = Dialect()
compressed = d.compress('${pyEscape(text)}'${metaArg})
stats = d.compression_stats('${pyEscape(text)}', compressed)
print(json.dumps({"compressed": compressed, "stats": stats}))
`.trim();

  return runPython<CompressionResult>(code);
}

// ---- Entity Tracking ----

/**
 * Extract entities from content and write them to the knowledge graph.
 * Uses Dialect._detect_entities_in_text() for text-based entity detection,
 * then writes discovered entities to the KG with agent-mention triples.
 */
export async function trackEntities(
  content: string,
  agentId: string,
  source?: string
): Promise<string[]> {
  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
from mempalace.dialect import Dialect
from mempalace.knowledge_graph import KnowledgeGraph

# Detect entities using Dialect's text-based detection
d = Dialect()
entity_codes = d._detect_entities_in_text('${pyEscape(content)}')

# Write to knowledge graph
kg = KnowledgeGraph('${pyEscape(config.kgPath)}')
for code in entity_codes:
    kg.add_entity(code, 'detected')

# Add context triple: entity was mentioned by this agent
from datetime import datetime
now = datetime.now().isoformat()[:10]
for code in entity_codes:
    kg.add_triple(
        code, 'mentioned_by', '${pyEscape(agentId)}',
        valid_from=now,
        source_file='${pyEscape(source ?? "bridge")}'
    )

print(json.dumps({"entities": entity_codes}))
`.trim();

  const result = await runPython<{ entities: string[] }>(code);
  return result?.entities ?? [];
}

/**
 * Query the knowledge graph for an entity's relationships.
 */
export async function queryEntity(
  name: string,
  asOf?: string
): Promise<KGTriple[]> {
  const asOfArg = asOf ? `, as_of='${pyEscape(asOf)}'` : "";

  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
from mempalace.knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph('${pyEscape(config.kgPath)}')
results = kg.query_entity('${pyEscape(name)}', direction='both'${asOfArg})
print(json.dumps(results))
`.trim();

  return (await runPython<KGTriple[]>(code)) ?? [];
}

/**
 * Get knowledge graph stats.
 */
export async function kgStats(): Promise<KGStats | null> {
  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
from mempalace.knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph('${pyEscape(config.kgPath)}')
print(json.dumps(kg.stats()))
`.trim();

  return runPython<KGStats>(code);
}

// ---- Palace Status ----

/**
 * Check if the palace is accessible and return basic stats.
 */
export async function palaceStatus(): Promise<{
  available: boolean;
  drawers: number;
  kg: KGStats | null;
} | null> {
  const code = `
import json, sys
sys.path.insert(0, '${pyEscape(process.cwd())}')
import chromadb
from mempalace.knowledge_graph import KnowledgeGraph

result = {"available": False, "drawers": 0, "kg": None}

try:
    client = chromadb.PersistentClient(path='${pyEscape(config.palacePath)}')
    col = client.get_collection('mempalace_drawers')
    result["available"] = True
    result["drawers"] = col.count()
except Exception:
    pass

try:
    kg = KnowledgeGraph('${pyEscape(config.kgPath)}')
    result["kg"] = kg.stats()
except Exception:
    pass

print(json.dumps(result))
`.trim();

  return runPython(code);
}

/**
 * Check if palace integration is enabled and the Python env is working.
 */
export function isPalaceEnabled(): boolean {
  return config.enabled;
}
