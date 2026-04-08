/**
 * Soul Context Builder — AkuaHive v1
 *
 * Builds intelligent context for agent dispatch by combining:
 *   1. Keyword-scored recent memories (Supabase or in-memory)
 *   2. Palace L3 semantic search (ChromaDB fallback)
 *   3. AAAK compression (optional density boost)
 *   4. Entity context from knowledge graph
 *
 * Adapted from XmetaV's buildSoulContext() with MemPalace integration.
 * In AkuaHive v1, this operates without Supabase — memories come from
 * the palace adapter. Future versions add Supabase dual-read.
 */

import {
  palaceSearch,
  compressContext,
  trackEntities,
  queryEntity,
  isPalaceEnabled,
} from "../palace/adapter.js";
import { DEFAULT_CONFIG } from "./types.js";
import type { SoulConfig, ScoredMemory, ContextPacket } from "./types.js";

const config: SoulConfig = DEFAULT_CONFIG;

/** Stop words to exclude from keyword extraction */
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "and", "but", "or",
  "not", "no", "nor", "so", "yet", "both", "each", "few", "more",
  "most", "other", "some", "such", "than", "too", "very", "just",
  "about", "up", "out", "it", "its", "my", "your", "his", "her",
  "their", "our", "this", "that", "these", "those", "i", "me", "we",
  "you", "he", "she", "they", "what", "which", "who", "whom",
  "how", "when", "where", "why", "all", "any",
]);

/**
 * Extract meaningful keywords from a task description.
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 20);
}

/**
 * Build an intelligent context preamble for agent dispatch.
 *
 * Flow:
 *   1. Extract keywords from the task message
 *   2. Search MemPalace for semantically relevant memories
 *   3. Optionally enrich with entity context from the knowledge graph
 *   4. Optionally compress the result with AAAK dialect
 *   5. Return a context string to prepend to the agent's task
 */
export async function buildSoulContext(
  agentId: string,
  taskMessage: string
): Promise<string> {
  if (!isPalaceEnabled()) return "";

  const keywords = extractKeywords(taskMessage);

  // Parallel: palace search + entity lookup for top keywords
  const [palaceHits, entityContext] = await Promise.all([
    // L3 semantic search from MemPalace
    palaceSearch(taskMessage, agentId, config.maxRetrievalCount),

    // Entity context: look up any proper nouns in the KG
    config.enableEntityTracking
      ? getEntityContext(taskMessage)
      : Promise.resolve(""),
  ]);

  if (palaceHits.length === 0 && !entityContext) {
    return "";
  }

  // Build the context string
  const lines: string[] = [];
  let chars = 0;
  const maxChars = config.maxContextChars;

  lines.push("--- CONTEXT (curated by Soul) ---");

  // Entity context (brief, high-value)
  if (entityContext) {
    lines.push(entityContext);
    chars += entityContext.length;
  }

  // Palace memories (semantic matches)
  if (palaceHits.length > 0) {
    for (const hit of palaceHits) {
      const simTag = hit.similarity >= 0.7 ? " \u2605" : "";
      const line = `[palace] ${hit.wing}/${hit.room}: ${hit.text.slice(0, 300)}${simTag}`;

      if (chars + line.length > maxChars) break;
      lines.push(line);
      chars += line.length + 1;
    }
  }

  lines.push("--- END CONTEXT ---");
  lines.push("");

  let result = lines.join("\n");

  // Optional AAAK compression for denser context
  if (config.enableCompression && result.length > 2000) {
    const compressed = await compressContext(result);
    // Only use compressed version if it's actually smaller
    if (compressed.length < result.length * 0.8) {
      result = [
        "--- CONTEXT (curated by Soul, AAAK compressed) ---",
        compressed,
        "--- END CONTEXT ---",
        "",
      ].join("\n");
    }
  }

  // Non-blocking: track entities from this task for future recall
  if (config.enableEntityTracking) {
    trackEntities(taskMessage, agentId, "soul-context").catch(() => {});
  }

  return result;
}

/**
 * Look up entity context from the knowledge graph.
 * Finds proper nouns in the message and returns their KG relationships.
 */
async function getEntityContext(message: string): Promise<string> {
  // Extract potential entity names (capitalized words not at sentence start)
  const words = message.split(/\s+/);
  const candidates: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-Z]/g, "");
    if (
      clean.length >= 2 &&
      clean[0] === clean[0].toUpperCase() &&
      clean[0] !== clean[0].toLowerCase() &&
      !STOP_WORDS.has(clean.toLowerCase())
    ) {
      // Skip if it's the first word (likely sentence start)
      if (i > 0 || clean.length > 3) {
        candidates.push(clean);
      }
    }
  }

  if (candidates.length === 0) return "";

  // Query KG for the first 3 candidates (parallel)
  const queries = candidates.slice(0, 3).map((name) =>
    queryEntity(name).then((triples) => ({ name, triples }))
  );

  const results = await Promise.all(queries);
  const lines: string[] = [];

  for (const { name, triples } of results) {
    const current = triples.filter((t) => t.current);
    if (current.length > 0) {
      const facts = current
        .slice(0, 3)
        .map((t) => `${t.subject} ${t.predicate} ${t.object}`)
        .join("; ");
      lines.push(`[entity] ${name}: ${facts}`);
    }
  }

  return lines.join("\n");
}

/**
 * Post-task processing: track entities and store associations.
 * Called after a command completes to build the memory graph.
 */
export async function processNewMemory(
  agentId: string,
  content: string
): Promise<void> {
  if (!isPalaceEnabled() || !config.enableEntityTracking) return;

  const entities = await trackEntities(content, agentId, "post-task");
  if (entities.length > 0) {
    console.log(`[soul] Tracked ${entities.length} entities from ${agentId}: ${entities.join(", ")}`);
  }
}

/**
 * Build a structured context packet (for API consumers).
 */
export async function buildContextPacket(
  agentId: string,
  taskMessage: string
): Promise<ContextPacket> {
  const palaceHits = isPalaceEnabled()
    ? await palaceSearch(taskMessage, agentId)
    : [];

  return {
    memories: [],
    insights: [],
    palace_hits: palaceHits.map((h) => ({
      text: h.text,
      wing: h.wing,
      room: h.room,
      similarity: h.similarity,
    })),
    compression: {
      enabled: config.enableCompression,
      ratio: 0,
    },
    total_anchors: 0,
  };
}
