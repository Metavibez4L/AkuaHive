/**
 * Soul Types — Adapted from XmetaV's Soul agent for AkuaHive
 *
 * The Soul layer sits between raw memory storage and agent execution,
 * curating what each agent remembers. In AkuaHive, Soul draws from
 * both Supabase (structured memory) and MemPalace (semantic search).
 */

// ---- Memory Entry (compatible with XmetaV agent_memory schema) ----

export type MemoryKind = "observation" | "outcome" | "fact" | "error" | "goal" | "note";

export interface MemoryEntry {
  id?: string;
  agent_id: string;
  kind: MemoryKind;
  content: string;
  source?: string;
  ttl_hours?: number | null;
  created_at?: string;
}

export interface ScoredMemory extends MemoryEntry {
  relevance: number;
  /** Where this memory came from: "supabase" or "palace" */
  origin: "supabase" | "palace";
}

// ---- Memory Associations ----

export type AssociationType = "causal" | "similar" | "sequential" | "related";

export interface MemoryAssociation {
  id?: string;
  memory_id: string;
  related_memory_id: string;
  association_type: AssociationType;
  strength: number; // 0.0 - 1.0
  created_at?: string;
}

// ---- Dream Insights ----

export interface DreamInsight {
  id?: string;
  insight: string;
  source_memories: string[];
  category: "pattern" | "recommendation" | "summary" | "correction";
  confidence: number; // 0.0 - 1.0
  generated_at?: string;
}

// ---- Context Packet ----

/** What Soul assembles for pre-dispatch injection */
export interface ContextPacket {
  memories: Array<{
    id: string;
    content: string;
    kind: string;
    relevance: number;
    age_hours: number;
    origin: "supabase" | "palace";
  }>;
  insights: Array<{
    insight: string;
    confidence: number;
  }>;
  palace_hits: Array<{
    text: string;
    wing: string;
    room: string;
    similarity: number;
  }>;
  compression?: {
    enabled: boolean;
    ratio: number;
  };
  total_anchors: number;
}

// ---- Soul Config ----

export interface SoulConfig {
  /** Max memories to retrieve per context query */
  maxRetrievalCount: number;
  /** Max characters in injected context (before AAAK compression) */
  maxContextChars: number;
  /** Hours of idle time before dream mode triggers */
  dreamIdleThresholdHours: number;
  /** Minimum association strength to include in context */
  minAssociationStrength: number;
  /** How many recent memories to scan for association building */
  associationScanWindow: number;
  /** Enable AAAK compression on the final context string */
  enableCompression: boolean;
  /** Enable palace L3 semantic search fallback */
  enablePalaceFallback: boolean;
  /** Enable entity tracking via knowledge graph */
  enableEntityTracking: boolean;
}

export const DEFAULT_CONFIG: SoulConfig = {
  maxRetrievalCount: 20,
  maxContextChars: 6000,
  dreamIdleThresholdHours: 6,
  minAssociationStrength: 0.3,
  associationScanWindow: 50,
  enableCompression: true,
  enablePalaceFallback: true,
  enableEntityTracking: true,
};
