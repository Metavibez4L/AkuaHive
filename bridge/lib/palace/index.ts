/**
 * Palace — Public API
 *
 * Re-exports the adapter functions and types for the MemPalace integration.
 */

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
} from "./adapter.js";

export {
  AGENT_WING_MAP,
  DEFAULT_WING,
  agentToWing,
  DEFAULT_PALACE_CONFIG,
} from "./types.js";

export type {
  PalaceHit,
  PalaceSearchResult,
  PalaceConfig,
  CompressionResult,
  KGTriple,
  KGStats,
} from "./types.js";
