// Serves demo/dist with the same routing as vercel.json, for local testing.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT) || 5188;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".txt": "text/plain", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

const fileFor = async (pathname) => {
  const candidate = join(dist, normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, ""));
  if (!candidate.startsWith(dist)) return null;
  try {
    if ((await stat(candidate)).isFile()) return candidate;
  } catch {
    /* fall through to the app shell */
  }
  for (const app of ["agency", "admin"]) {
    if (pathname === `/${app}` || pathname.startsWith(`/${app}/`)) return join(dist, app, "index.html");
  }
  return join(dist, "index.html");
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  const file = await fileFor(pathname);
  if (!file) return res.writeHead(400).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Bayti demo on http://localhost:${port}`));
