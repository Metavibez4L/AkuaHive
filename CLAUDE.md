# CLAUDE.md — AkuaHive Engineering Guide

## What This Is

AkuaHive is a memory infrastructure product. It wraps MemPalace (Python, local-first AI memory engine) in a bridge layer that gives XmetaV-compatible agent fleets semantic search, AAAK compression, entity tracking, and Soul-style context curation.

**One sentence:** MemPalace is the engine, the bridge is the orchestration, AkuaHive is the product.

## Architecture

```
AkuaHive/
├── mempalace/           # Python memory engine — DO NOT MODIFY without reason
│   ├── searcher.py      # ChromaDB semantic search (search_memories)
│   ├── dialect.py       # AAAK ~30x symbolic compression (Dialect.compress)
│   ├── knowledge_graph.py # SQLite temporal entity-relationship graph
│   ├── layers.py        # 4-layer memory stack (L0 identity → L3 deep search)
│   ├── mcp_server.py    # MCP server (19 tools, stdio JSON-RPC)
│   ├── miner.py         # Project file ingestion → ChromaDB drawers
│   ├── convo_miner.py   # Conversation ingestion (Q+A pair chunking)
│   └── ...              # 16 modules total
│
├── bridge/              # TypeScript orchestration layer
│   ├── lib/
│   │   ├── index.ts     # Public API — import from here
│   │   ├── palace/
│   │   │   ├── adapter.ts  # Python subprocess calls (search, store, compress, entities)
│   │   │   └── types.ts    # PalaceHit, PalaceConfig, agent→wing mapping
│   │   └── soul/
│   │       ├── context.ts  # buildSoulContext() — the main brain
│   │       └── types.ts    # SoulConfig, ContextPacket, ScoredMemory
│   ├── dist/            # Compiled JS (git-ignored)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/specs/          # Design documents
└── tests/               # Python tests for mempalace
```

## How the Bridge Works

The bridge calls MemPalace Python via `child_process.execFile("python3", ["-c", code])`. Each call:
- Spawns a short-lived Python process
- Imports mempalace, runs one operation, prints JSON to stdout
- Node parses the result
- 5s timeout, non-fatal — if Python fails, Soul returns empty context

This is intentional (Option A from design). Upgrade path: MCP stdio or HTTP sidecar.

## Key Functions

```typescript
// Before dispatching an agent task:
import { buildSoulContext } from "@akuahive/bridge";
const context = await buildSoulContext("web3dev", "deploy the staking contract");
// Returns: "--- CONTEXT (curated by Soul) ---\n[palace] technical/outcome: ..."

// Direct palace operations:
import { palaceSearch, palaceStore, compressContext, trackEntities } from "@akuahive/bridge";
const hits = await palaceSearch("staking contract", "web3dev");
await palaceStore("web3dev", "Deployed to 0x7a2b", "outcome");
const compressed = await compressContext(longText);
const entities = await trackEntities("Alice deployed StakingVault", "web3dev");
```

## Agent → Wing Mapping

Agents map to palace wings for filtered search:

| Agent | Wing |
|-------|------|
| main, sentinel, briefing | operations |
| soul | memory |
| oracle | intelligence |
| web3dev, basedintern, akua | technical |
| midas | revenue |
| alchemist | tokenomics |

## Build & Run

```bash
# Install and compile bridge
cd bridge && npm install && npx tsc

# Install Python deps (if not already)
pip3 install chromadb pyyaml

# Initialize palace (if fresh)
cd .. && python3 -m mempalace.cli init .

# Test the bridge
node --input-type=module -e "
import { palaceStatus } from './bridge/dist/palace/index.js';
console.log(await palaceStatus());
"
```

## Environment

```env
# All optional — these are defaults
PALACE_PATH=~/.mempalace/palace
PALACE_KG_PATH=~/.mempalace/knowledge_graph.sqlite3
MEMPALACE_PYTHON=python3
PALACE_ENABLED=true
```

No API keys. No cloud. Everything local.

## XmetaV Reference

XmetaV (cloned at `/tmp/XmetaV/`, dev branch) is the upstream agent fleet system. AkuaHive's bridge is modeled after its patterns:
- `Soul` context curation → our `bridge/lib/soul/context.ts`
- `agent-memory.ts` capture flow → our `palaceStore()` dual-write
- `memory_associations` table → our knowledge graph triples
- On-chain anchoring → future integration (not in v1)

**Do not modify the XmetaV repo.** It's reference only.

## Rules

- **mempalace/ is the engine.** Don't break its standalone PyPI package contract. Changes there must keep `pip install mempalace` working.
- **bridge/ is the glue.** All XmetaV-specific logic lives here. MemPalace should never import or depend on bridge code.
- **Non-fatal everything.** Every bridge→Python call must be wrapped in try/catch. A palace failure must never crash agent dispatch.
- **No Supabase in v1.** Palace is the sole memory backend for now. Supabase dual-read comes in v2.
- **subprocess, not HTTP.** Keep the Python communication as `execFile` calls. Don't add Flask/FastAPI until latency actually matters.
- **TypeScript strict mode.** Bridge compiles with `strict: true`. No `any` types.
