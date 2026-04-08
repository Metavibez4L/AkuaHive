import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON = process.env.MEMPALACE_PYTHON ?? "python3";
const PALACE_PATH = process.env.PALACE_PATH ?? `${process.env.HOME}/.mempalace/palace`;
const PROJECT_ROOT = process.env.AKUAHIVE_ROOT ?? process.cwd().replace("/dashboard", "");

export async function POST(req: NextRequest) {
  try {
    const { query, wing, room, n_results = 10 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const wingArg = wing ? `, wing='${wing}'` : "";
    const roomArg = room ? `, room='${room}'` : "";

    const code = `
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
from mempalace.searcher import search_memories
result = search_memories('${query.replace(/'/g, "\\'")}', '${PALACE_PATH}', n_results=${n_results}${wingArg}${roomArg})
print(json.dumps(result))
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
