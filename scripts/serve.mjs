// Minimal zero-dependency static file server for local preview.
// Usage: node scripts/serve.mjs [port]   (default 8080)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import process from "node:process";

const PORT = Number(process.argv[2] || 8080);
const ROOT = process.cwd();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (urlPath === "/") urlPath = "/TesterTech.html";
    // Resolve safely inside ROOT (block path traversal).
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("404 Not Found");
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    }).end(body);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("500 " + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`Tester Tech preview running:`);
  console.log(`  http://localhost:${PORT}/TesterTech.html   (storefront)`);
  console.log(`  http://localhost:${PORT}/index.html         (Smart Watch Pro)`);
  console.log(`Serving ${ROOT} — press Ctrl+C to stop.`);
});
