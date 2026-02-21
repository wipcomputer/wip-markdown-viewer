#!/usr/bin/env node
// simple-web-markdown-viewer/server.js
// Multi-file markdown viewer with live reload. Works in all browsers.
//
// Usage:
//   mdview                         Start server, open homepage
//   mdview --port 8080             Use custom port
//   mdview --root /path/to/dir     Restrict file access to this directory
//
// Opens browser to http://127.0.0.1:3000/ — pick files, view with live reload.

import { createServer } from "node:http";
import { readFileSync, watch, existsSync, statSync } from "node:fs";
import { resolve, basename, dirname, join, extname } from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Parse args ───────────────────────────────────────────────────────

let port = 3000;
let rootDir = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--root" && args[i + 1]) {
    rootDir = resolve(args[i + 1]);
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`mdview: live markdown viewer

Usage:
  mdview                         Start server, open homepage
  mdview --port 8080             Use custom port
  mdview --root /path/to/dir     Restrict file access to this directory

Options:
  --root <dir>   Only serve files under this directory. Prevents access
                 to files outside the specified path. Recommended for
                 shared or multi-user environments.

Opens browser to http://127.0.0.1:PORT/ — pick files, view with live reload.
Works in all browsers (Safari, Chrome, Firefox).`);
    process.exit(0);
  }
}

// Validate that a file path is allowed. Returns the resolved path or null.
function validateFilePath(filePath) {
  if (!filePath) return null;
  const resolved = resolve(filePath);
  if (rootDir && !resolved.startsWith(rootDir + "/") && resolved !== rootDir) {
    return null;
  }
  return resolved;
}

// ── Multi-file watcher ──────────────────────────────────────────────

// Map<absolutePath, { clients: Set<res>, watcher: FSWatcher, lastMtime: number }>
const watchers = new Map();

// SSE keepalive: ping all clients every 30s so connections don't go stale
setInterval(() => {
  for (const [, entry] of watchers) {
    for (const client of entry.clients) {
      try { client.write(`:keepalive\n\n`); }
      catch { entry.clients.delete(client); }
    }
  }
}, 30_000);

function startWatching(filePath) {
  if (watchers.has(filePath)) return;

  let lastMtime = 0;
  try { lastMtime = statSync(filePath).mtimeMs; } catch {}

  const entry = { clients: new Set(), watcher: null, lastMtime };
  watchers.set(filePath, entry);

  // Use fs.watch (native OS events) instead of fs.watchFile (polling).
  // Debounce to avoid duplicate events (common on macOS).
  let debounce = null;
  try {
    entry.watcher = watch(filePath, () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        let currMtime = 0;
        try { currMtime = statSync(filePath).mtimeMs; } catch {}
        if (currMtime > entry.lastMtime) {
          entry.lastMtime = currMtime;
          console.log(`File changed: ${basename(filePath)}`);
          for (const client of entry.clients) {
            try { client.write(`data: reload\n\n`); }
            catch { entry.clients.delete(client); }
          }
        }
      }, 200);
    });
  } catch (err) {
    console.error(`Watch failed for ${filePath}: ${err.message}`);
  }
}

function stopWatching(filePath) {
  const entry = watchers.get(filePath);
  if (entry && entry.clients.size === 0) {
    if (entry.watcher) entry.watcher.close();
    watchers.delete(filePath);
  }
}

function addClient(filePath, res) {
  startWatching(filePath);
  const entry = watchers.get(filePath);
  entry.clients.add(res);
}

function removeClient(filePath, res) {
  const entry = watchers.get(filePath);
  if (entry) {
    entry.clients.delete(res);
    stopWatching(filePath);
  }
}

// ── Viewer HTML with SSE injection ──────────────────────────────────

function getViewerHtml(filePath) {
  const viewerPath = join(__dirname, "markdown-viewer.html");
  let html = readFileSync(viewerPath, "utf-8");

  const script = `
    <script>
    // Server mode: auto-load, refresh from server, SSE live reload
    (function() {
      const filePath = ${JSON.stringify(filePath)};
      const fileName = ${JSON.stringify(basename(filePath))};
      const encodedPath = encodeURIComponent(filePath);
      let showingFullPath = false;

      async function serverLoad() {
        const res = await fetch('/api/file?path=' + encodedPath);
        if (!res.ok) throw new Error(res.statusText);
        const text = await res.text();
        const content = document.getElementById('markdown-content');
        const scrollTop = content ? content.parentElement.scrollTop : 0;
        document.getElementById('drop-zone').classList.add('hidden');
        document.getElementById('viewer-container').style.display = 'flex';
        const nameEl = document.getElementById('file-name');
        nameEl.textContent = fileName;
        nameEl.title = filePath;
        nameEl.style.cursor = 'pointer';
        nameEl.onclick = function() {
          showingFullPath = !showingFullPath;
          nameEl.textContent = showingFullPath ? filePath : fileName;
        };
        await displayMarkdown(text);
        lastModified = Date.now();
        updateLastModified();
        if (content) content.parentElement.scrollTop = scrollTop;
      }

      window.addEventListener('DOMContentLoaded', async function() {
        await new Promise(r => setTimeout(r, 50));
        try { await serverLoad(); setLiveStatus('live'); } catch (err) { console.error('Load failed:', err); }
      });

      window.refreshContent = async function() {
        try {
          await serverLoad();
          showStatus('Refreshed', 1500);
        } catch (err) {
          showStatus('Error refreshing', 2000);
        }
      };

      function connectSSE() {
        const evtSource = new EventSource('/api/events?path=' + encodedPath);
        evtSource.onmessage = async function(event) {
          if (event.data === 'reload') {
            try { await serverLoad(); showStatus('Auto-refreshed', 1500); }
            catch (err) { console.error('Reload failed:', err); }
          }
        };
        evtSource.onerror = function() {
          evtSource.close();
          setTimeout(connectSSE, 2000);
        };
      }
      connectSSE();
    })();
    </script>`;

  const lastIndex = html.lastIndexOf("</body>");
  html = html.slice(0, lastIndex) + script + "\n" + html.slice(lastIndex);
  return html;
}

// ── Session viewer HTML (drag-and-drop, no live reload) ─────────────

function getSessionViewerHtml(fileName) {
  const viewerPath = join(__dirname, "markdown-viewer.html");
  let html = readFileSync(viewerPath, "utf-8");

  const script = `
    <script>
    // Session mode: restore from sessionStorage, no live reload
    (function() {
      const fileName = ${JSON.stringify(fileName)};

      window.addEventListener('DOMContentLoaded', async function() {
        await new Promise(r => setTimeout(r, 50));
        const content = sessionStorage.getItem('mdview-content');
        if (!content) {
          document.getElementById('file-name').textContent = 'File not found in session';
          return;
        }
        document.getElementById('drop-zone').classList.add('hidden');
        document.getElementById('viewer-container').style.display = 'flex';
        document.getElementById('file-name').textContent = fileName;
        setLiveStatus('static');
        await displayMarkdown(content);
        lastModified = Date.now();
        updateLastModified();
      });

      window.refreshContent = async function() {
        const content = sessionStorage.getItem('mdview-content');
        if (content) {
          await displayMarkdown(content);
          showStatus('Refreshed from session', 1500);
        }
      };
    })();
    </script>`;

  const lastIndex = html.lastIndexOf("</body>");
  html = html.slice(0, lastIndex) + script + "\n" + html.slice(lastIndex);
  return html;
}

// ── HTTP server ─────────────────────────────────────────────────────

const mimeTypes = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".ico": "image/x-icon", ".css": "text/css", ".js": "application/javascript",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Homepage — always the picker
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const viewerPath = join(__dirname, "markdown-viewer.html");
    res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" });
    res.end(readFileSync(viewerPath, "utf-8"));
    return;
  }

  // Viewer — file loaded with live reload (path) or sessionStorage (name)
  if (url.pathname === "/view") {
    const filePath = validateFilePath(url.searchParams.get("path"));
    const fileName = url.searchParams.get("name");

    if (filePath && existsSync(filePath)) {
      // Server-backed viewer with live reload
      res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" });
      res.end(getViewerHtml(filePath));
    } else if (fileName) {
      // sessionStorage-backed viewer (drag-and-drop, no live reload)
      res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" });
      res.end(getSessionViewerHtml(fileName));
    } else {
      res.writeHead(302, { Location: "/" });
      res.end();
    }
    return;
  }

  // API: read a specific file
  if (url.pathname === "/api/file") {
    const filePath = validateFilePath(url.searchParams.get("path"));
    if (!filePath || !existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
    try {
      const content = readFileSync(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-cache" });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Error: ${err.message}`);
    }
    return;
  }

  // API: SSE events for a specific file
  if (url.pathname === "/api/events") {
    const filePath = validateFilePath(url.searchParams.get("path"));
    if (!filePath || !existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: connected\n\n`);
    addClient(filePath, res);
    req.on("close", () => { removeClient(filePath, res); });
    return;
  }

  // Serve bundled vendor files (no CDN dependency)
  if (url.pathname.startsWith("/vendor/")) {
    const vendorPath = join(__dirname, url.pathname);
    if (existsSync(vendorPath) && statSync(vendorPath).isFile()) {
      const ext = extname(vendorPath).toLowerCase();
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      res.end(readFileSync(vendorPath));
      return;
    }
  }

  // Serve static files relative to a viewed file's directory
  const referer = req.headers.referer;
  if (referer) {
    try {
      const refUrl = new URL(referer);
      const refPath = refUrl.searchParams.get("path");
      if (refPath) {
        const fileDir = dirname(refPath);
        const requestedPath = resolve(fileDir, url.pathname.slice(1));
        const validatedStatic = validateFilePath(requestedPath);
        if (validatedStatic && requestedPath.startsWith(fileDir) && existsSync(requestedPath) && statSync(requestedPath).isFile()) {
          const ext = extname(requestedPath).toLowerCase();
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          res.end(readFileSync(requestedPath));
          return;
        }
      }
    } catch {}
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

// ── Start ────────────────────────────────────────────────────────────

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`mdview: ${url}`);
  if (rootDir) console.log(`root: ${rootDir} (file access restricted)`);
  console.log(`Press Ctrl+C to stop.\n`);

  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${url}"`);
});

process.on("SIGINT", () => {
  for (const [, entry] of watchers) {
    if (entry.watcher) entry.watcher.close();
  }
  server.close();
  process.exit(0);
});
