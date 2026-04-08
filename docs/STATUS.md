# AkuaHive — Project Status

**Version:** 1.0.0
**Date:** 2026-04-07
**Branch:** main

---

## System Health

```mermaid
graph LR
    subgraph "AkuaHive v1 — Status"
        MP["MemPalace Engine<br/>✅ 16 modules<br/>Python 3.9+"]
        BR["Bridge Layer<br/>✅ 8 TypeScript files<br/>Node 20+"]
        KG["Knowledge Graph<br/>✅ SQLite<br/>~/.mempalace/"]
        CB["ChromaDB Palace<br/>✅ Local vector store<br/>~/.mempalace/palace/"]
    end

    MP --- CB
    MP --- KG
    BR -->|subprocess| MP

    style MP fill:#064e3b,stroke:#10b981,color:#fff
    style BR fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style KG fill:#1e3a5f,stroke:#e879f9,color:#fff
    style CB fill:#1e3a5f,stroke:#00f0ff,color:#fff
```

---

## Component Status

| Component | Status | Version | Notes |
|-----------|--------|---------|-------|
| **MemPalace Engine** | ✅ Stable | 3.0.0 | 16 Python modules, PyPI-compatible |
| **Bridge Layer** | ✅ v1 Complete | 1.0.0 | 8 TypeScript files, subprocess adapter |
| **Palace Adapter** | ✅ Working | — | search, store, compress, entities, KG query, status |
| **Soul Context** | ✅ Working | — | buildSoulContext() with palace L3 fallback |
| **AAAK Compression** | ✅ Working | — | ~30x compression on structured text |
| **Knowledge Graph** | ✅ Working | — | Entity detection + temporal triples |
| **ChromaDB Store** | ✅ Working | — | Semantic vector search across drawers |
| **Supabase Integration** | 🔲 Not started | — | v2: dual-read from Supabase + Palace |
| **On-Chain Anchoring** | 🔲 Not started | — | v2: IPFS + Base Mainnet via XmetaV pattern |
| **Dream Mode** | 🔲 Not started | — | v2: idle consolidation from palace data |
| **MCP Upgrade** | 🔲 Not started | — | v2: replace subprocess with MCP stdio |
| **Dashboard UI** | 🔲 Not started | — | v2: palace browser in XmetaV dashboard |

---

## What Works Today

```mermaid
flowchart TD
    TASK["Agent receives task"] --> SOUL["buildSoulContext()"]

    SOUL --> PAR["Parallel execution"]

    PAR --> SEARCH["palaceSearch()<br/>ChromaDB semantic search<br/>filtered by agent wing"]
    PAR --> ENTITY["getEntityContext()<br/>KG lookup for proper nouns"]

    SEARCH --> BUILD["Assemble context string"]
    ENTITY --> BUILD

    BUILD --> COMPRESS{"Context > 2000 chars?"}
    COMPRESS -->|yes| AAAK["compressContext()<br/>AAAK Dialect"]
    COMPRESS -->|no| RAW["Use raw context"]

    AAAK --> INJECT["Prepend to task message"]
    RAW --> INJECT

    INJECT --> AGENT["Agent executes with context"]

    AGENT --> CAPTURE["captureCommandOutcome()"]
    CAPTURE --> DUAL["Dual write"]

    DUAL --> SUPA["Supabase<br/>(future v2)"]
    DUAL --> PALACE["palaceStore()<br/>ChromaDB drawer"]

    CAPTURE --> TRACK["trackEntities()<br/>KG triple writes"]

    style SOUL fill:#ff006e,stroke:#ff006e,color:#fff
    style SEARCH fill:#064e3b,stroke:#10b981,color:#fff
    style AAAK fill:#1e3a5f,stroke:#e879f9,color:#fff
    style PALACE fill:#1e3a5f,stroke:#00f0ff,color:#fff
    style SUPA fill:#333,stroke:#666,color:#999
```

---

## Integration Points with XmetaV

| XmetaV Component | AkuaHive Equivalent | Status |
|-----------------|---------------------|--------|
| `soul/context.ts` → `buildSoulContext()` | `bridge/lib/soul/context.ts` | ✅ Adapted |
| `soul/retrieval.ts` → keyword scoring | `palaceSearch()` → semantic search | ✅ Upgraded |
| `agent-memory.ts` → `captureCommandOutcome()` | `palaceStore()` dual-write | ✅ Ready |
| `soul/types.ts` → `SoulConfig` | `bridge/lib/soul/types.ts` + palace config | ✅ Extended |
| `memory_associations` table | Knowledge graph triples | ✅ Different approach, same goal |
| `soul/dream.ts` → idle consolidation | Not yet | 🔲 v2 |
| `memory-anchor.ts` → IPFS + Base | Not yet | 🔲 v2 |
| Supabase Realtime → dashboard sync | Not yet | 🔲 v2 |

---

## Roadmap

### v1.0 (Current) — Local Memory Bridge
- [x] Python subprocess adapter
- [x] Palace semantic search in Soul context
- [x] AAAK compression pipeline
- [x] Entity detection + KG tracking
- [x] Agent → wing routing
- [x] CLAUDE.md engineering guide
- [x] Design spec

### v2.0 — XmetaV Full Integration
- [ ] Supabase dual-read (palace + Postgres)
- [ ] On-chain anchoring for palace drawers
- [ ] Dream mode using palace + KG data
- [ ] MCP stdio upgrade (replace subprocess)
- [ ] Dashboard palace browser page
- [ ] Association reinforcement from palace hits

### v3.0 — Fleet Intelligence
- [ ] Cross-agent entity resolution (KG unifies mentions)
- [ ] Palace-powered dream insights
- [ ] AAAK-compressed on-chain anchors (denser IPFS blobs)
- [ ] Real-time KG sync to Supabase for dashboard queries
