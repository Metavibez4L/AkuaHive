/**
 * AkuaHive Bridge — Main entry point
 *
 * Connects MemPalace (Python memory engine) to Soul-style orchestration
 * (TypeScript context curation). This is the integration layer that makes
 * MemPalace available to XmetaV-compatible agent fleets.
 *
 * Usage:
 *   import { buildSoulContext, palaceSearch } from "@akuahive/bridge";
 *
 *   // Before dispatching an agent task:
 *   const context = await buildSoulContext("web3dev", "deploy the staking contract");
 *   const enrichedMessage = context + originalMessage;
 *
 *   // Direct palace search:
 *   const hits = await palaceSearch("staking contract deployment");
 */

// Soul — context curation
export {
  buildSoulContext,
  buildContextPacket,
  processNewMemory,
  extractKeywords,
  DEFAULT_CONFIG,
} from "./soul/index.js";

export type {
  SoulConfig,
  MemoryEntry,
  MemoryKind,
  ScoredMemory,
  ContextPacket,
  DreamInsight,
} from "./soul/index.js";

// Palace — MemPalace adapter
export {
  palaceSearch,
  palaceStore,
  compressContext,
  compressWithStats,
  trackEntities,
  queryEntity,
  kgStats,
  palaceStatus,
  isPalaceEnabled,
  AGENT_WING_MAP,
  agentToWing,
} from "./palace/index.js";

export type {
  PalaceHit,
  PalaceConfig,
  CompressionResult,
  KGTriple,
  KGStats,
} from "./palace/index.js";
