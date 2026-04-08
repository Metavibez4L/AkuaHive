import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON = process.env.MEMPALACE_PYTHON ?? "python3";
const KG_PATH = process.env.PALACE_KG_PATH ?? `${process.env.HOME}/.mempalace/knowledge_graph.sqlite3`;
const PROJECT_ROOT = process.env.AKUAHIVE_ROOT ?? process.cwd().replace("/dashboard", "");

/** GET /api/palace/kg/entity?name=Alice — query entity relationships */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  try {
    const code = `
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
from mempalace.knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph('${KG_PATH}')
triples = kg.query_entity('${name.replace(/'/g, "\\'")}', direction='both')
timeline = kg.timeline('${name.replace(/'/g, "\\'")}')
print(json.dumps({"name": "${name.replace(/"/g, '\\"')}", "triples": triples, "timeline": timeline}))
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
