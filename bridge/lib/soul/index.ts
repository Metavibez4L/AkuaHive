/**
 * Soul — Public API
 *
 * The memory orchestration layer for AkuaHive.
 * Curates context from MemPalace + knowledge graph for agent dispatch.
 */

export {
  buildSoulContext,
  buildContextPacket,
  processNewMemory,
  extractKeywords,
} from "./context.js";

export { DEFAULT_CONFIG } from "./types.js";

export type {
  SoulConfig,
  MemoryEntry,
  MemoryKind,
  ScoredMemory,
  MemoryAssociation,
  AssociationType,
  DreamInsight,
  ContextPacket,
} from "./types.js";
