import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON = process.env.MEMPALACE_PYTHON ?? "python3";
const KG_PATH = process.env.PALACE_KG_PATH ?? `${process.env.HOME}/.mempalace/knowledge_graph.sqlite3`;
const PROJECT_ROOT = process.env.AKUAHIVE_ROOT ?? process.cwd().replace("/dashboard", "");

/** GET /api/palace/kg — returns full KG stats + recent entities */
export async function GET() {
  try {
    const code = `
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
from mempalace.knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph('${KG_PATH}')
stats = kg.stats()

# Get all entities
import sqlite3
conn = sqlite3.connect('${KG_PATH}', timeout=5)
entities = []
for row in conn.execute("SELECT id, name, type, properties, created_at FROM entities ORDER BY created_at DESC LIMIT 50").fetchall():
    entities.append({"id": row[0], "name": row[1], "type": row[2], "properties": json.loads(row[3] or '{}'), "created_at": row[4]})
conn.close()

timeline = kg.timeline()[:30]

print(json.dumps({"stats": stats, "entities": entities, "timeline": timeline}))
`.trim();

    const { stdout } = await execFileAsync(PYTHON, ["-c", code], {
      timeout: 5000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });

    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
