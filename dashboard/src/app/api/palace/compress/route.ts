import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON = process.env.MEMPALACE_PYTHON ?? "python3";
const PROJECT_ROOT = process.env.AKUAHIVE_ROOT ?? process.cwd().replace("/dashboard", "");

/** POST /api/palace/compress — AAAK compress text */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");

    const code = `
import json, sys
sys.path.insert(0, '${PROJECT_ROOT}')
from mempalace.dialect import Dialect

d = Dialect()
compressed = d.compress('${escaped}')
stats = d.compression_stats('${escaped}', compressed)
print(json.dumps({"compressed": compressed, "stats": stats}))
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
