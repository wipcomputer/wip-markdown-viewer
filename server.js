#!/usr/bin/env node
// simple-web-markdown-viewer/server.js
// Local server for markdown viewing. Works in all browsers.
//
// Usage:
//   mdview <file.md>              Open file in browser with live reload
//   mdview --port 8080 <file.md>  Use custom port
//
// Opens browser automatically. Watches file for changes.

import { createServer } from "node:http";
import { readFileSync, watchFile, unwatchFile, existsSync, statSync } from "node:fs";
import { resolve, basename, dirname, join, extname } from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Parse args ───────────────────────────────────────────────────────

let port = 3000;
let filePath = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`markdown-viewer: local server with live reload

Usage:
  mdview <file.md>              Open file in browser with live reload
  mdview --port 8080 <file.md>  Use custom port

Works in all browsers (Safari, Chrome, Firefox).`);
    process.exit(0);
  } else if (!args[i].startsWith("-")) {
    filePath = resolve(args[i]);
  }
}

if (!filePath) {
  console.error("Usage: mdview <file.md>");
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`Error: file not found: ${filePath}`);
  process.exit(1);
}

// ── SSE clients ──────────────────────────────────────────────────────

const sseClients = new Set();

function notifyClients() {
  for (const res of sseClients) {
    try {
      res.write(`data: reload\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

// ── File watcher ─────────────────────────────────────────────────────

let lastMtime = 0;

function startWatching() {
  try {
    lastMtime = statSync(filePath).mtimeMs;
  } catch {}

  watchFile(filePath, { interval: 500 }, (curr) => {
    if (curr.mtimeMs > lastMtime) {
      lastMtime = curr.mtimeMs;
      console.log(`File changed: ${basename(filePath)}`);
      notifyClients();
    }
  });
}

// ── Viewer HTML ──────────────────────────────────────────────────────

function injectScript(html, script) {
  const lastIndex = html.lastIndexOf("</body>");
  return html.slice(0, lastIndex) + script + "\n" + html.slice(lastIndex);
}

function getFileViewerHtml() {
  const viewerPath = join(__dirname, "markdown-viewer.html");
  let html = readFileSync(viewerPath, "utf-8");

  const script = `
    <script>
    // Server mode: auto-load, refresh from server, SSE live reload
    (function() {
      const fileName = ${JSON.stringify(basename(filePath))};

      async function serverLoad() {
        const res = await fetch('/api/file');
        if (!res.ok) throw new Error(res.statusText);
        const text = await res.text();
        const content = document.getElementById('markdown-content');
        const scrollTop = content ? content.parentElement.scrollTop : 0;
        document.getElementById('drop-zone').classList.add('hidden');
        document.getElementById('viewer-container').style.display = 'flex';
        document.getElementById('file-name').textContent = fileName;
        await displayMarkdown(text);
        lastModified = Date.now();
        updateLastModified();
        if (content) content.parentElement.scrollTop = scrollTop;
      }

      window.addEventListener('DOMContentLoaded', async function() {
        await new Promise(r => setTimeout(r, 50));
        try { await serverLoad(); } catch (err) { console.error('Load failed:', err); }
      });

      window.refreshContent = async function() {
        try {
          await serverLoad();
          showStatus('Refreshed', 1500);
        } catch (err) {
          showStatus('Error refreshing', 2000);
        }
      };

      const evtSource = new EventSource('/api/events');
      evtSource.onmessage = async function(event) {
        if (event.data === 'reload') {
          try { await serverLoad(); showStatus('Auto-refreshed', 1500); }
          catch (err) { console.error('Reload failed:', err); }
        }
      };
    })();
    </script>`;

  return injectScript(html, script);
}

function getLandingHtml() {
  const viewerPath = join(__dirname, "markdown-viewer.html");
  let html = readFileSync(viewerPath, "utf-8");

  const script = `
    <script>
    // Landing page: persist loaded file in localStorage so Safari refresh works
    (function() {
      const origDisplay = window.displayMarkdown;
      window.displayMarkdown = async function(text) {
        localStorage.setItem('mdview-content', text);
        return origDisplay(text);
      };

      const origLoadFile = window.loadFile;
      window.loadFile = async function(file, isAutoRefresh) {
        localStorage.setItem('mdview-name', file.name);
        return origLoadFile(file, isAutoRefresh);
      };

      // On page load, restore last file from localStorage
      window.addEventListener('DOMContentLoaded', async function() {
        const stored = localStorage.getItem('mdview-content');
        const name = localStorage.getItem('mdview-name');
        if (stored) {
          await new Promise(r => setTimeout(r, 50));
          document.getElementById('drop-zone').classList.add('hidden');
          document.getElementById('viewer-container').style.display = 'flex';
          if (name) document.getElementById('file-name').textContent = name;
          await displayMarkdown(stored);
          lastModified = Date.now();
          updateLastModified();
        }
      });

      window.refreshContent = async function() {
        const stored = localStorage.getItem('mdview-content');
        if (stored) {
          await displayMarkdown(stored);
          showStatus('Refreshed', 1500);
        } else {
          showStatus('No file loaded', 2000);
        }
      };
    })();
    </script>`;

  return injectScript(html, script);
}

// ── HTTP server ──────────────────────────────────────────────────────

const fileDir = dirname(filePath);

const server = createServer((req, res) => {
  // Landing page (homepage)
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getLandingHtml());
    return;
  }

  // File viewer (auto-load, refresh, SSE)
  if (req.url.startsWith("/?file=")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getFileViewerHtml());
    return;
  }

  // API: read the watched file
  if (req.url === "/api/file") {
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

  // API: SSE events
  if (req.url === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: connected\n\n`);
    sseClients.add(res);
    req.on("close", () => { sseClients.delete(res); });
    return;
  }

  // Serve static files (images) relative to the markdown file's directory
  const requestedPath = resolve(fileDir, req.url.slice(1));
  if (requestedPath.startsWith(fileDir) && existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    const ext = extname(requestedPath).toLowerCase();
    const mimeTypes = {
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
      ".ico": "image/x-icon", ".css": "text/css", ".js": "application/javascript",
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(readFileSync(requestedPath));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

// ── Start ────────────────────────────────────────────────────────────

server.listen(port, "127.0.0.1", () => {
  const fileUrl = `http://127.0.0.1:${port}/?file=${encodeURIComponent(filePath)}`;
  console.log(`Markdown viewer: http://127.0.0.1:${port}`);
  console.log(`Watching: ${filePath}`);
  console.log(`Press Ctrl+C to stop.\n`);

  startWatching();

  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${fileUrl}"`);
});

process.on("SIGINT", () => {
  unwatchFile(filePath);
  server.close();
  process.exit(0);
});
