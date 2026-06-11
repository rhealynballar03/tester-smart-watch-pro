#!/usr/bin/env node
/**
 * Kie.ai image generation client (Nano Banana / Gemini image models).
 *
 * Creates an async task on Kie.ai, polls until it finishes, then downloads the
 * resulting image to a local path. Zero dependencies — uses Node's built-in
 * fetch (Node 18+).
 *
 * Docs:
 *   Create task : POST https://api.kie.ai/api/v1/jobs/createTask
 *   Get result  : GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...
 *   (Result URLs expire ~24h after generation, so we download immediately.)
 *
 * The API key is read from KIE_API_KEY (env or a .env line). It is never printed.
 *
 * Usage:
 *   node scripts/kie-image.mjs --prompt "A product render of ..." \
 *     --output assets/smart-glasses.jpg --aspect 4:3 --resolution 2K
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const API_BASE = "https://api.kie.ai";
const CREATE_URL = `${API_BASE}/api/v1/jobs/createTask`;
const RECORD_URL = `${API_BASE}/api/v1/jobs/recordInfo`;

// Kie.ai model ids for the Google image family.
const MODELS = {
  "2": "nano-banana-2",          // Gemini 3.1 Flash image — fast + up to 4K (default)
  pro: "nano-banana-pro",        // Gemini 3 Pro image — highest quality
  flash: "google/nano-banana",   // Gemini 2.5 Flash image — cheapest/fastest
};

export function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    a[key] = next !== undefined && !next.startsWith("--") ? argv[++i] : "true";
  }
  return a;
}

export async function loadKey() {
  if (process.env.KIE_API_KEY && process.env.KIE_API_KEY.trim()) {
    return process.env.KIE_API_KEY.trim();
  }
  try {
    const txt = await readFile(".env", "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith("KIE_API_KEY=")) {
        const v = t.slice("KIE_API_KEY=".length).trim().replace(/^['"]|['"]$/g, "");
        if (v) return v;
      }
    }
  } catch {
    /* no .env — fall through */
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createTask(key, model, input) {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 200) {
    throw new Error(`createTask failed: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  const id = body?.data?.taskId;
  if (!id) throw new Error(`createTask returned no taskId: ${JSON.stringify(body)}`);
  return id;
}

async function pollTask(key, taskId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`timed out after ${timeoutMs}ms waiting for ${taskId}`);
    await sleep(3000);
    let res;
    try {
      res = await fetch(`${RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
    } catch (e) {
      console.error(`  (poll error ${e.message}, retrying)`);
      continue;
    }
    if (!res.ok) {
      console.error(`  (poll HTTP ${res.status}, retrying)`);
      continue;
    }
    const body = await res.json();
    const data = body.data || {};
    const state = data.state;
    if (state !== last) {
      console.log(`  state: ${state}  progress: ${data.progress ?? ""}`);
      last = state;
    }
    if (state === "success") {
      const result = JSON.parse(data.resultJson || "{}");
      const urls = result.resultUrls || [];
      if (!urls.length) throw new Error(`task succeeded but had no resultUrls: ${data.resultJson}`);
      return urls[0];
    }
    if (state === "fail") throw new Error(`task failed: ${data.failCode} ${data.failMsg}`);
  }
}

async function download(url, output) {
  // Honor the exact requested output path so it always matches the HTML
  // references. (The API sometimes returns .jpeg/.png even when jpg is asked;
  // browsers and static hosts render by content-sniffing regardless of name.)
  const dir = path.dirname(output);
  if (dir) await mkdir(dir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  await writeFile(output, Buffer.from(await res.arrayBuffer()));
  return output;
}

export async function generate({ key, model = "2", prompt, output, aspect = "1:1", resolution = "2K", format = "jpg", timeoutMs = 300000 }) {
  const modelId = MODELS[model] || MODELS["2"];
  const input = { prompt, aspect_ratio: aspect, resolution, output_format: format };
  const taskId = await createTask(key, modelId, input);
  console.log(`  task: ${taskId}`);
  const url = await pollTask(key, taskId, timeoutMs);
  return download(url, output);
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.prompt || !a.output) {
    console.error('Usage: node scripts/kie-image.mjs --prompt "..." --output assets/x.jpg [--aspect 4:3] [--resolution 1K|2K|4K] [--model 2|pro|flash]');
    process.exit(2);
  }
  const key = await loadKey();
  if (!key) {
    console.error("ERROR: KIE_API_KEY not found in environment or .env file.");
    console.error("Add a line `KIE_API_KEY=your_key_here` to .env (get a key at https://kie.ai).");
    process.exit(2);
  }
  console.log(`Generating: "${a.prompt.slice(0, 60)}..." -> ${a.output}`);
  try {
    const final = await generate({
      key,
      model: a.model || "2",
      prompt: a.prompt,
      output: a.output,
      aspect: a.aspect || "1:1",
      resolution: a.resolution || "2K",
      format: a["output-format"] || "jpg",
      timeoutMs: Number(a.timeout || 300) * 1000,
    });
    console.log(`Image saved to: ${final}`);
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

// Run main() only when executed directly (not when imported).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
