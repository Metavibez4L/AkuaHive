# AkuaHive v1 — Design Spec

**Date:** 2026-04-07
**Status:** Implemented
**Approach:** Option B — MemPalace as enhancement layer alongside XmetaV

## Summary

AkuaHive v1 integrates MemPalace (Python, ChromaDB + SQLite) as a second memory layer for XmetaV-style agent orchestration. MemPalace provides semantic vector search, AAAK compression, and entity tracking via a subprocess adapter. The existing XmetaV Supabase memory system is unmodified — palace sits alongside as an enhancement.

## Architecture

```
AkuaHive/
├── mempalace/              # Python memory engine (unchanged)
│   ├── searcher.py         # ChromaDB semantic search
│   ├── dialect.py          # AAAK ~30x compression
│   ├── knowledge_graph.py  # SQLite temporal entity graph
│   └── ...                 # 16 modules total
│
├── bridge/                 # TypeScript orchestration layer (NEW)
│   ├── lib/
│   │   ├── index.ts        # Public API
│   │   ├── palace/
│   │   │   ├── types.ts    # PalaceHit, PalaceConfig, agent-wing map
│   │   │   ├── adapter.ts  # Python subprocess calls
│   │   │   └── index.ts    # Re-exports
│   │   └── soul/
│   │       ├── types.ts    # SoulConfig, ContextPacket, ScoredMemory
│   │       ├── context.ts  # buildSoulContext() with palace fallback
│   │       └── index.ts    # Re-exports
│   ├── package.json
│   └── tsconfig.json
```

## Communication: TypeScript → Python

All cross-language calls use `child_process.execFile("python3", ["-c", code])`:

- Each call spawns a short-lived Python process
- Python code imports mempalace modules, runs one operation, prints JSON to stdout
- Node parses the JSON output
- 5-second timeout per call
- All calls are non-fatal: if Python fails, Soul continues with empty results

## Components

### Palace Adapter (`bridge/lib/palace/adapter.ts`)

| Function | Python Module | Purpose |
|----------|--------------|---------|
| `palaceSearch(query, agentId?)` | `searcher.search_memories()` | Semantic search filtered by agent wing |
| `palaceStore(agentId, content, kind, source)` | ChromaDB `col.add()` | Write memory drawer |
| `compressContext(text)` | `dialect.Dialect.compress()` | AAAK compression |
| `trackEntities(content, agentId)` | `dialect._detect_entities_in_text()` + `KnowledgeGraph` | Entity detection + KG writes |
| `queryEntity(name)` | `KnowledgeGraph.query_entity()` | KG relationship lookup |
| `palaceStatus()` | ChromaDB + KG stats | Health check |

### Soul Context Builder (`bridge/lib/soul/context.ts`)

`buildSoulContext(agentId, taskMessage)` flow:

1. Extract keywords from task message
2. **Parallel:** Palace semantic search + Entity KG lookup
3. Build context string with `[palace]` and `[entity]` prefixes
4. **Optional:** AAAK compress if context > 2000 chars
5. **Non-blocking:** Track entities from task message for future recall

### Agent → Wing Mapping

| Agent | Wing |
|-------|------|
| main, sentinel, briefing | operations |
| soul | memory |
| oracle | intelligence |
| web3dev, basedintern, akua | technical |
| midas | revenue |
| alchemist | tokenomics |

## Config

Environment variables (all optional, sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `PALACE_PATH` | `~/.mempalace/palace` | ChromaDB directory |
| `PALACE_KG_PATH` | `~/.mempalace/knowledge_graph.sqlite3` | SQLite KG path |
| `MEMPALACE_PYTHON` | `python3` | Python binary |
| `PALACE_ENABLED` | `true` | Kill switch |

## What's NOT in v1

- No Supabase integration (palace is standalone memory backend)
- No MCP server connection (future upgrade from subprocess to MCP)
- No dream mode (future: idle consolidation using palace data)
- No on-chain anchoring (future: anchor palace drawers to Base)
- No dashboard UI for palace browsing

## Test Results

End-to-end verified:
- Palace store: 4 drawers written to ChromaDB
- Entity tracking: 3 entities detected, 2 KG triples created
- Semantic search: relevant memories returned with similarity scores
- Soul context: proper `[palace]` prefixed context string generated
- AAAK compression: working (better ratio on longer texts)
- TypeScript compilation: clean, zero errors
