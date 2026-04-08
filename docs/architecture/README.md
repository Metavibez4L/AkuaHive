# AkuaHive — Architecture

> Two memory systems, one orchestration layer, zero cloud dependencies.

---

## The Big Picture

AkuaHive merges MemPalace (local AI memory engine) with XmetaV (multi-agent fleet orchestration) through a TypeScript bridge. MemPalace handles storage and retrieval. The bridge handles curation and routing. Agents get richer context without knowing where it came from.

```mermaid
graph TB
    subgraph "Agent Fleet (XmetaV)"
        MAIN["main<br/>orchestrator"]
        WEB3["web3dev<br/>blockchain"]
        ORACLE["oracle<br/>intel"]
        SENTINEL["sentinel<br/>fleet ops"]
        MIDAS["midas<br/>revenue"]
        OTHER["... 7 more agents"]
    end

    subgraph "AkuaHive Bridge (TypeScript)"
        SOUL["Soul Context Builder<br/>buildSoulContext()"]
        ADAPTER["Palace Adapter<br/>subprocess → Python"]
        COMPRESS["AAAK Compressor<br/>compressContext()"]
        TRACKER["Entity Tracker<br/>trackEntities()"]
    end

    subgraph "MemPalace Engine (Python)"
        SEARCH["Semantic Search<br/>ChromaDB embeddings"]
        DIALECT["AAAK Dialect<br/>~30x compression"]
        KG["Knowledge Graph<br/>SQLite temporal triples"]
        LAYERS["4-Layer Stack<br/>L0→L3"]
        MINER["Miners<br/>project + conversation"]
    end

    subgraph "Storage (Local)"
        CHROMADB[("ChromaDB<br/>~/.mempalace/palace")]
        SQLITE[("SQLite<br/>~/.mempalace/knowledge_graph.sqlite3")]
        IDENTITY["identity.txt<br/>~/.mempalace/"]
    end

    subgraph "XmetaV Storage (Future v2)"
        SUPA[("Supabase<br/>agent_memory")]
        CHAIN["Base Mainnet<br/>AgentMemoryAnchor"]
        IPFS["IPFS / Pinata"]
    end

    MAIN & WEB3 & ORACLE & SENTINEL & MIDAS & OTHER -->|task| SOUL
    SOUL -->|query| ADAPTER
    SOUL -->|compress| COMPRESS
    SOUL -->|entities| TRACKER

    ADAPTER -->|subprocess| SEARCH
    COMPRESS -->|subprocess| DIALECT
    TRACKER -->|subprocess| KG

    SEARCH --> CHROMADB
    KG --> SQLITE
    LAYERS --> CHROMADB
    LAYERS --> IDENTITY
    MINER --> CHROMADB

    SOUL -.->|v2| SUPA
    ADAPTER -.->|v2| CHAIN
    ADAPTER -.->|v2| IPFS

    style SOUL fill:#ff006e,stroke:#ff006e,color:#fff
    style ADAPTER fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style SEARCH fill:#064e3b,stroke:#10b981,color:#fff
    style CHROMADB fill:#064e3b,stroke:#10b981,color:#fff
    style KG fill:#1e3a5f,stroke:#e879f9,color:#fff
    style SQLITE fill:#1e3a5f,stroke:#e879f9,color:#fff
    style SUPA fill:#333,stroke:#666,color:#999
    style CHAIN fill:#333,stroke:#666,color:#999
    style IPFS fill:#333,stroke:#666,color:#999
```

---

## Data Flow — Command Lifecycle

Every agent task follows this path through the system:

```mermaid
sequenceDiagram
    participant F as Agent Fleet
    participant S as Soul (Bridge)
    participant P as Palace Adapter
    participant C as ChromaDB
    participant K as Knowledge Graph
    participant D as AAAK Dialect

    Note over F,D: Phase 1 — Context Retrieval

    F->>S: buildSoulContext("web3dev", "deploy staking contract")
    S->>S: extractKeywords() → [deploy, staking, contract]

    par Parallel Fetch
        S->>P: palaceSearch("deploy staking contract", "web3dev")
        P->>C: query_texts=["deploy staking contract"], wing="technical"
        C-->>P: PalaceHit[] (similarity-ranked)
        P-->>S: top 5 hits
    and Entity Lookup
        S->>K: queryEntity("StakingVault")
        K-->>S: triples: StakingVault→deployed_by→web3dev
    end

    S->>S: Assemble context lines ([palace], [entity])

    opt Context > 2000 chars
        S->>D: compressContext(rawContext)
        D-->>S: AAAK compressed string
    end

    S-->>F: "--- CONTEXT (curated by Soul) ---\n..."

    Note over F,D: Phase 2 — Agent Execution

    F->>F: Execute task with enriched context

    Note over F,D: Phase 3 — Memory Capture

    F->>P: palaceStore("web3dev", output, "outcome")
    P->>C: col.add(document, metadata={wing, room, agent_id})

    F->>K: trackEntities(output, "web3dev")
    K->>K: detect entities → add_entity() + add_triple()
```

---

## The Subprocess Bridge

All TypeScript ↔ Python communication uses one pattern:

```mermaid
flowchart LR
    subgraph "Node.js (Bridge)"
        CALL["adapter function<br/>e.g. palaceSearch()"]
        EXEC["execFile('python3', ['-c', code])"]
        PARSE["JSON.parse(stdout)"]
    end

    subgraph "Python (MemPalace)"
        IMPORT["import mempalace module"]
        RUN["Execute operation"]
        PRINT["print(json.dumps(result))"]
    end

    CALL --> EXEC
    EXEC -->|spawn process| IMPORT
    IMPORT --> RUN
    RUN --> PRINT
    PRINT -->|stdout| PARSE
    PARSE --> CALL

    style EXEC fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style RUN fill:#064e3b,stroke:#10b981,color:#fff
```

**Properties:**
- ~200ms per call (process spawn + import + operation)
- 5s timeout, non-fatal
- 1MB max buffer per response
- No persistent connection — stateless calls
- `PYTHONDONTWRITEBYTECODE=1` to avoid .pyc clutter

---

## Memory Hierarchy

AkuaHive has two complementary memory systems. They serve different purposes and will merge in v2.

```mermaid
graph TB
    subgraph "MemPalace — Semantic Memory"
        direction TB
        L0["L0: Identity<br/>~100 tokens<br/>identity.txt"]
        L1["L1: Essential Story<br/>~500-800 tokens<br/>top drawers by importance"]
        L2["L2: On-Demand<br/>~200-500 tokens<br/>wing/room filtered"]
        L3["L3: Deep Search<br/>unlimited<br/>ChromaDB semantic"]
    end

    subgraph "XmetaV — Operational Memory (v2)"
        direction TB
        AM["agent_memory<br/>Supabase Postgres<br/>kind, TTL, per-agent"]
        MA["memory_associations<br/>typed links + strength<br/>causal, similar, sequential"]
        DI["dream_insights<br/>patterns, corrections<br/>idle consolidation"]
        MQ["memory_queries<br/>retrieval log<br/>learning feedback"]
    end

    subgraph "Knowledge Graph — Entity Memory"
        direction TB
        ENT["Entities<br/>people, contracts, tokens"]
        TRI["Triples<br/>subject→predicate→object<br/>temporal validity"]
    end

    subgraph "On-Chain — Permanent Memory (v2)"
        direction TB
        IPFS2["IPFS Pin<br/>JSON blob"]
        ANCHOR["Base Mainnet<br/>keccak256(CID)<br/>AgentMemoryAnchor"]
    end

    L3 -.->|"semantic fallback"| AM
    TRI -.->|"entity context"| AM
    AM -.->|"significant events"| ANCHOR
    L3 -.->|"anchor drawers"| IPFS2

    style L0 fill:#064e3b,stroke:#10b981,color:#fff
    style L1 fill:#064e3b,stroke:#10b981,color:#fff
    style L2 fill:#064e3b,stroke:#10b981,color:#fff
    style L3 fill:#064e3b,stroke:#10b981,color:#fff
    style AM fill:#333,stroke:#666,color:#999
    style MA fill:#333,stroke:#666,color:#999
    style DI fill:#333,stroke:#666,color:#999
    style MQ fill:#333,stroke:#666,color:#999
    style ANCHOR fill:#333,stroke:#666,color:#999
    style IPFS2 fill:#333,stroke:#666,color:#999
    style ENT fill:#1e3a5f,stroke:#e879f9,color:#fff
    style TRI fill:#1e3a5f,stroke:#e879f9,color:#fff
```

### How They Merge (v2 Plan)

| Memory Type | v1 (Now) | v2 (Planned) |
|------------|----------|-------------|
| **Short-term** (task outcomes, errors) | Palace drawers only | Supabase `agent_memory` + Palace dual-write |
| **Long-term** (facts, goals) | Palace drawers + KG | Supabase (permanent TTL) + Palace + KG |
| **Semantic** (meaning-based recall) | Palace ChromaDB search | Palace search as L3 fallback for Soul scoring |
| **Relational** (entity connections) | KG SQLite triples | KG triples + Supabase `memory_associations` |
| **Consolidated** (patterns, insights) | Not yet | Dream mode reads Palace + KG, writes `dream_insights` |
| **Permanent** (on-chain) | Not yet | Anchor significant Palace drawers to IPFS + Base |

---

## Agent → Wing Routing

When an agent writes or searches memory, the bridge routes to the correct palace wing:

```mermaid
graph LR
    subgraph "Agents"
        A1["main"]
        A2["sentinel"]
        A3["briefing"]
        A4["soul"]
        A5["oracle"]
        A6["web3dev"]
        A7["basedintern"]
        A8["akua"]
        A9["midas"]
        A10["alchemist"]
    end

    subgraph "Palace Wings"
        W1["operations"]
        W2["memory"]
        W3["intelligence"]
        W4["technical"]
        W5["revenue"]
        W6["tokenomics"]
    end

    A1 & A2 & A3 --> W1
    A4 --> W2
    A5 --> W3
    A6 & A7 & A8 --> W4
    A9 --> W5
    A10 --> W6

    style W1 fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style W2 fill:#ff006e,stroke:#ff006e,color:#fff
    style W3 fill:#064e3b,stroke:#10b981,color:#fff
    style W4 fill:#1e3a5f,stroke:#e879f9,color:#fff
    style W5 fill:#7f1d1d,stroke:#ef4444,color:#fff
    style W6 fill:#064e3b,stroke:#10b981,color:#fff
```

Wings are search filters, not hard partitions. An agent can search across all wings — the wing mapping just gives Soul a relevance hint.

---

## AAAK Compression Pipeline

The AAAK Dialect compresses plain text into a symbolic format any LLM reads natively:

```mermaid
flowchart TD
    INPUT["Plain text<br/>'We decided to deploy the staking<br/>contract on Base mainnet...'"]

    INPUT --> DETECT["Detect components"]

    subgraph "Detection"
        DETECT --> ENT["Entities<br/>BAS, GAS"]
        DETECT --> TOP["Topics<br/>eth_base_gas"]
        DETECT --> QUO["Key sentence<br/>'We decided to deploy...'"]
        DETECT --> EMO["Emotions<br/>determ"]
        DETECT --> FLG["Flags<br/>DECISION+TECHNICAL"]
    end

    ENT & TOP & QUO & EMO & FLG --> ENCODE["Encode to AAAK"]

    ENCODE --> OUTPUT["0:BAS+GAS|eth_base_gas|<br/>'We decided to deploy...'|<br/>determ|DECISION+TECHNICAL"]

    OUTPUT --> STATS["174 chars → 106 chars<br/>~1.6x on short text<br/>~30x on structured zettel data"]

    style INPUT fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style OUTPUT fill:#064e3b,stroke:#10b981,color:#fff
    style STATS fill:#ff006e22,stroke:#ff006e,color:#fff
```

**When compression fires:** Only when Soul context exceeds 2000 characters. Short contexts pass through uncompressed — the overhead isn't worth it for small payloads.

---

## Knowledge Graph — Entity Memory

The KG tracks entities and their relationships across all agent interactions:

```mermaid
erDiagram
    entities {
        text id PK "lowercase_name"
        text name "Display name"
        text type "person | contract | token | detected"
        text properties "JSON blob"
        text created_at
    }

    triples {
        text id PK "t_subject_pred_object_hash"
        text subject FK "entity id"
        text predicate "deployed_by, mentioned_by, child_of..."
        text object FK "entity id"
        text valid_from "When this became true"
        text valid_to "When this stopped being true (null = current)"
        real confidence "0.0 - 1.0"
        text source_closet "Link to memory drawer"
        text source_file
        text extracted_at
    }

    entities ||--o{ triples : "subject"
    entities ||--o{ triples : "object"
```

**Temporal validity** is the key differentiator. The KG knows *when* facts were true:

```mermaid
graph LR
    subgraph "StakingVault Timeline"
        T1["2026-02-10<br/>compiled_by → web3dev"]
        T2["2026-02-12<br/>audited_by → akua"]
        T3["2026-02-14<br/>deployed_to → Base Mainnet"]
        T4["2026-03-01<br/>upgraded_by → web3dev<br/>(invalidates deploy)"]
    end

    T1 --> T2 --> T3 --> T4

    style T1 fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style T2 fill:#064e3b,stroke:#10b981,color:#fff
    style T3 fill:#ff006e,stroke:#ff006e,color:#fff
    style T4 fill:#7f1d1d,stroke:#ef4444,color:#fff
```

---

## File Map

```
AkuaHive/
│
├── mempalace/                    # Python memory engine (standalone)
│   ├── __init__.py               # v3.0.0
│   ├── cli.py                    # CLI: init, mine, search, compress, wake-up
│   ├── config.py                 # MempalaceConfig, palace path, topic wings
│   ├── searcher.py               # search() + search_memories() — ChromaDB
│   ├── layers.py                 # MemoryStack: L0 identity → L3 deep search
│   ├── dialect.py                # AAAK Dialect: compress(), encode_zettel()
│   ├── knowledge_graph.py        # KnowledgeGraph: entities + temporal triples
│   ├── palace_graph.py           # BFS traversal, tunnel finding
│   ├── miner.py                  # Project file → ChromaDB drawers
│   ├── convo_miner.py            # Conversation → ChromaDB (Q+A chunking)
│   ├── normalize.py              # 5 chat format normalizer
│   ├── entity_detector.py        # Regex entity detection with signal scoring
│   ├── entity_registry.py        # Entity lookup/disambiguation
│   ├── general_extractor.py      # Memory type extraction (decisions, milestones...)
│   ├── onboarding.py             # Interactive setup flow
│   ├── mcp_server.py             # MCP stdio server (19 tools)
│   ├── spellcheck.py             # Spell correction preserving entities
│   ├── split_mega_files.py       # Split concatenated transcripts
│   └── room_detector_local.py    # Auto-detect rooms from folder structure
│
├── bridge/                       # TypeScript orchestration (AkuaHive glue)
│   ├── lib/
│   │   ├── index.ts              # Public API — import from here
│   │   ├── palace/
│   │   │   ├── adapter.ts        # Python subprocess: search, store, compress, entities
│   │   │   ├── types.ts          # PalaceHit, PalaceConfig, agent→wing map
│   │   │   └── index.ts          # Re-exports
│   │   └── soul/
│   │       ├── context.ts        # buildSoulContext() — the main brain
│   │       ├── types.ts          # SoulConfig, ContextPacket, ScoredMemory
│   │       └── index.ts          # Re-exports
│   ├── dist/                     # Compiled JS (gitignored)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── STATUS.md                 # Project status and roadmap
│   ├── architecture/
│   │   └── README.md             # This file — system architecture
│   └── specs/
│       └── 2026-04-07-akuahive-v1-design.md
│
├── tests/                        # Python tests
├── CLAUDE.md                     # Engineering guide for Claude Code
├── pyproject.toml                # Python package config
└── README.md                     # User-facing documentation
```

---

## Next

- [Project Status](../STATUS.md) — Component status, integration points, roadmap
- [v1 Design Spec](../specs/2026-04-07-akuahive-v1-design.md) — Original design decisions
- [CLAUDE.md](../../CLAUDE.md) — Engineering rules and quick reference
