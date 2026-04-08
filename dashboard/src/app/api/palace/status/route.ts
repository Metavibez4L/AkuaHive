import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON = process.env.MEMPALACE_PYTHON ?? "python3";
const PALACE_PATH = process.env.PALACE_PATH ?? `${process.env.HOME}/.mempalace/palace`;
const KG_PATH = process.env.PALACE_KG_PATH ?? `${process.env.HOME}/.mempalace/knowledge_graph.sqlite3`;
const PROJECT_ROOT = process.env.AKUAHIVE_ROOT ?? process.cwd().replace("/dashboard", "");

export async function GET() {
  try {
    const code = `
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
import chromadb
from mempalace.knowledge_graph import KnowledgeGraph

result = {"available": False, "drawers": 0, "wings": {}, "kg": None}

try:
    client = chromadb.PersistentClient(path='${PALACE_PATH}')
    col = client.get_collection('mempalace_drawers')
    result["available"] = True
    result["drawers"] = col.count()

    # Get wing/room breakdown
    all_meta = col.get(include=["metadatas"])
    wings = {}
    for m in all_meta.get("metadatas", []):
        w = m.get("wing", "unknown")
        r = m.get("room", "unknown")
        if w not in wings:
            wings[w] = {"count": 0, "rooms": {}}
        wings[w]["count"] += 1
        wings[w]["rooms"][r] = wings[w]["rooms"].get(r, 0) + 1
    result["wings"] = wings
except Exception:
    pass

try:
    kg = KnowledgeGraph('${KG_PATH}')
    result["kg"] = kg.stats()
except Exception:
    pass

print(json.dumps(result))
`.trim();

    const { stdout } = await execFileAsync(PYTHON, ["-c", code], {
      timeout: 5000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });

    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, available: false }, { status: 500 });
  }
}
