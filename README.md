<div align="center">

# AkuaHive

### Memory infrastructure for autonomous agent fleets.

<br>

MemPalace is the engine. The bridge is the orchestration. AkuaHive is the product.

<br>

[![][version-shield]][release-link]
[![][python-shield]][python-link]
[![][license-shield]][license-link]
[![][discord-shield]][discord-link]

<br>

[Architecture](#architecture) · [Dashboard](#dashboard) · [Bridge](#bridge) · [MemPalace](#mempalace-engine) · [Quick Start](#quick-start) · [Roadmap](#roadmap)

</div>

---

## What This Is

AkuaHive wraps [MemPalace](https://github.com/milla-jovovich/mempalace) (Python, local-first AI memory engine) in a TypeScript bridge that gives XmetaV-compatible agent fleets:

- **Semantic search** — ChromaDB vector search across all agent memories, filtered by wing/room
- **AAAK compression** — ~30x lossless compression dialect any LLM reads natively
- **Entity tracking** — SQLite temporal knowledge graph with validity windows
- **Soul context curation** — Parallel palace search + KG lookup, auto-compressed, prepended to agent tasks

No API keys. No cloud. Everything runs on your machine.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard (Next.js 16)          http://localhost:3000   │
│  ├── /memory    — status cards, wing breakdown, AAAK    │
│  ├── /palace    — wing/room browser, semantic search    │
│  ├── /knowledge — entity list, relationships, timeline  │
│  └── /api/palace/* — 5 API routes                       │
├─────────────────────────────────────────────────────────┤
│  Bridge (TypeScript)                                     │
│  ├── Soul Context Builder  — buildSoulContext()          │
│  ├── Palace Adapter        — subprocess → Python         │
│  ├── AAAK Compressor       — compressContext()           │
│  └── Entity Tracker        — trackEntities()             │
├─────────────────────────────────────────────────────────┤
│  MemPalace Engine (Python 3.9+)                          │
│  ├── ChromaDB semantic search  (search_memories)         │
│  ├── AAAK Dialect              (Dialect.compress)        │
│  ├── Knowledge Graph           (SQLite temporal triples) │
│  ├── 4-Layer Memory Stack      (L0 identity → L3 deep)  │
│  └── MCP Server                (19 tools, stdio)         │
├─────────────────────────────────────────────────────────┤
│  Storage (Local)                                         │
│  ├── ~/.mempalace/palace/              ChromaDB vectors  │
│  └── ~/.mempalace/knowledge_graph.sqlite3    KG triples  │
└─────────────────────────────────────────────────────────┘
```

The bridge calls MemPalace via `child_process.execFile("python3", ["-c", code])`. Each call spawns a short-lived Python process (~200ms), prints JSON to stdout, and returns. If Python fails, agents continue without memory context. Non-fatal everything.

---

## Dashboard

The dashboard is a Next.js 16 app forked from XmetaV and rebranded for AkuaHive. It provides a visual interface to the palace, knowledge graph, and memory system.

### Pages

| Page | Path | What It Does |
|------|------|--------------|
| **Command Center** | `/` | Fleet overview (from XmetaV) |
| **Memory System** | `/memory` | 4 status cards (palace, wings, KG entities, KG triples), wing breakdown with room bar charts, AAAK compression playground |
| **Palace** | `/palace` | Wing/room filter pills, semantic search bar, drawer results with similarity scores and star ratings |
| **Knowledge Graph** | `/knowledge` | 3-column layout: entity list with filter, relationship detail panel, timeline |
| **Agent Chat** | `/agent` | Agent interaction (from XmetaV) |
| + 15 more | | Swarms, Fleet, Intent, Consciousness, Payments, Identity, Oracle, Token, Logs, Arena, Memory Cosmos, Midas Revenue, Intelligence, Trading/DeFi |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/palace/search` | POST | Semantic search via ChromaDB, body: `{ query, wing?, nResults? }` |
| `/api/palace/status` | GET | Palace health, drawer count, wing/room breakdown, KG stats |
| `/api/palace/kg` | GET | KG stats, entity list, timeline |
| `/api/palace/kg/entity` | GET | Single entity triples + timeline, `?name=X` |
| `/api/palace/compress` | POST | AAAK compression, body: `{ text }` |

### Run the Dashboard

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

---

## Bridge

The bridge is the TypeScript glue between agent fleets and MemPalace. Import from `@akuahive/bridge`.

### Key Functions

```typescript
import { buildSoulContext } from "@akuahive/bridge";

// Before dispatching an agent task — get palace context
const context = await buildSoulContext("web3dev", "deploy the staking contract");
// Returns: "--- CONTEXT (curated by Soul) ---\n[palace] technical/outcome: ..."

// Direct palace operations
import { palaceSearch, palaceStore, compressContext, trackEntities } from "@akuahive/bridge";

const hits = await palaceSearch("staking contract", "web3dev");
await palaceStore("web3dev", "Deployed to 0x7a2b", "outcome");
const compressed = await compressContext(longText);
const entities = await trackEntities("Alice deployed StakingVault", "web3dev");
```

### Agent → Wing Mapping

| Agent | Wing |
|-------|------|
| main, sentinel, briefing | operations |
| soul | memory |
| oracle | intelligence |
| web3dev, basedintern, akua | technical |
| midas | revenue |
| alchemist | tokenomics |

### Build the Bridge

```bash
cd bridge
npm install
npx tsc
```

---

## MemPalace Engine

MemPalace is the Python memory engine underneath AkuaHive. 16 modules, standalone PyPI package, 96.6% LongMemEval R@5.

Full documentation: [mempalace/README.md](https://github.com/milla-jovovich/mempalace)

### Core Concepts

- **Palace** — Wings (people/projects) → Rooms (topics) → Halls (memory types) → Closets (summaries) → Drawers (original files)
- **AAAK** — Lossless ~30x compression dialect. Any LLM reads it natively. Works with Claude, GPT, Gemini, Llama, Mistral.
- **Memory Stack** — L0 identity (~50 tokens) + L1 critical facts (~120 tokens) loaded on wake-up. L2/L3 on demand.
- **Knowledge Graph** — SQLite temporal entity-relationship triples with validity windows.
- **MCP Server** — 19 tools via stdio JSON-RPC.

### Install

```bash
pip install mempalace
# or from this repo:
pip3 install chromadb pyyaml
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Metavibez4L/AkuaHive.git
cd AkuaHive

# 2. Python dependencies
pip3 install chromadb pyyaml

# 3. Initialize palace (if fresh)
python3 -m mempalace.cli init .

# 4. Build the bridge
cd bridge && npm install && npx tsc && cd ..

# 5. Set up dashboard
cd dashboard
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment

```env
# Required for dashboard
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Palace (defaults, no keys needed)
PALACE_PATH=~/.mempalace/palace
PALACE_KG_PATH=~/.mempalace/knowledge_graph.sqlite3
MEMPALACE_PYTHON=python3
PALACE_ENABLED=true

# Optional integrations
OPENAI_API_KEY=sk-...          # voice transcribe/synthesize
EVM_PRIVATE_KEY=0x...          # on-chain anchoring (v2)
SOLANA_PRIVATE_KEY=...         # Solana integrations
CDP_API_KEY_ID=...             # Coinbase Developer Platform
SLACK_BOT_TOKEN=xoxb-...      # Slack bot
```

See `dashboard/.env.example` for the full template.

---

## Roadmap

### v1.1 (Current) — Dashboard + API
- [x] Python subprocess bridge (search, store, compress, entities, KG)
- [x] Soul context builder with palace L3 fallback
- [x] Dashboard with Palace browser, KG explorer, Memory dashboard
- [x] 5 API routes for palace operations
- [x] Agent → wing routing for 10+ agents
- [x] AAAK compression pipeline
- [x] CDP, Solana, Jupiter integration ready

### v2.0 — XmetaV Full Integration
- [ ] Supabase dual-read (palace + Postgres)
- [ ] On-chain anchoring for palace drawers (IPFS + Base Mainnet)
- [ ] Dream mode using palace + KG data
- [ ] MCP stdio upgrade (replace subprocess)
- [ ] Supabase Realtime for live dashboard updates

### v3.0 — Fleet Intelligence
- [ ] Cross-agent entity resolution (KG unifies mentions)
- [ ] Palace-powered dream insights
- [ ] AAAK-compressed on-chain anchors (denser IPFS blobs)
- [ ] Real-time KG sync to Supabase

---

## Project Structure

```
AkuaHive/
├── mempalace/           # Python memory engine — standalone PyPI package
├── bridge/              # TypeScript orchestration layer
├── dashboard/           # Next.js 16 dashboard (forked from XmetaV)
├── docs/
│   ├── STATUS.md        # Component status and roadmap
│   ├── architecture/    # System architecture with mermaid diagrams
│   └── specs/           # Design specifications
├── tests/               # Python tests
├── CLAUDE.md            # Engineering guide
└── README.md            # This file
```

---

## License

MIT — see [LICENSE](LICENSE).

<!-- Link Definitions -->
[version-shield]: https://img.shields.io/badge/version-1.1.0-4dc9f6?style=flat-square&labelColor=0a0e14
[release-link]: https://github.com/Metavibez4L/AkuaHive/releases
[python-shield]: https://img.shields.io/badge/python-3.9+-7dd8f8?style=flat-square&labelColor=0a0e14&logo=python&logoColor=7dd8f8
[python-link]: https://www.python.org/
[license-shield]: https://img.shields.io/badge/license-MIT-b0e8ff?style=flat-square&labelColor=0a0e14
[license-link]: https://github.com/Metavibez4L/AkuaHive/blob/main/LICENSE
[discord-shield]: https://img.shields.io/badge/discord-join-5865F2?style=flat-square&labelColor=0a0e14&logo=discord&logoColor=5865F2
[discord-link]: https://discord.com/invite/ycTQQCu6kn
