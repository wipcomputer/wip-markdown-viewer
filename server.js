#!/usr/bin/env node
// simple-web-markdown-viewer/server.js
// Local server for markdown viewing with live reload. Works in all browsers.
//
// Usage:
//   node server.js /path/to/file.md
//   node server.js --port 3000 /path/to/file.md
//
// Opens browser automatically. Watches file for changes and pushes updates via SSE.

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
  mdview <file.md>              Open markdown file in browser with live reload
  mdview --port 8080 <file.md>  Use custom port

Works in all browsers (Safari, Chrome, Firefox).`);
    process.exit(0);
  } else if (!args[i].startsWith("-")) {
    filePath = resolve(args[i]);
  }
}

if (!filePath) {
  console.error("Error: no file specified. Usage: mdview <file.md>");
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

// ── Viewer HTML with SSE injection ───────────────────────────────────

function getViewerHtml() {
  const viewerPath = join(__dirname, "markdown-viewer.html");
  let html = readFileSync(viewerPath, "utf-8");

  // Inject SSE auto-reload and auto-load script before </body>
  const sseScript = `
    <script>
    // SSE live reload (injected by server.js)
    (function() {
      const fileName = ${JSON.stringify(basename(filePath))};

      // Auto-load file on page load
      window.addEventListener('load', async function() {
        try {
          const res = await fetch('/api/file');
          if (res.ok) {
            const text = await res.text();
            // Hide drop zone, show viewer
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('viewer-container').style.display = 'flex';
            document.getElementById('file-name').textContent = fileName;
            await displayMarkdown(text);
            updateLastModified();
            showStatus('Loaded ' + fileName, 2000);
          }
        } catch (err) {
          console.error('Auto-load failed:', err);
        }
      });

      // SSE connection for live reload
      const evtSource = new EventSource('/api/events');
      evtSource.onmessage = async function(event) {
        if (event.data === 'reload') {
          try {
            const res = await fetch('/api/file');
            if (res.ok) {
              const text = await res.text();
              // Preserve scroll position
              const content = document.getElementById('markdown-content');
              const scrollTop = content.parentElement.scrollTop;
              await displayMarkdown(text);
              content.parentElement.scrollTop = scrollTop;
              document.getElementById('file-name').textContent = fileName;
              lastModified = Date.now();
              updateLastModified();
              showStatus('Auto-refreshed', 1500);
            }
          } catch (err) {
            console.error('Reload failed:', err);
          }
        }
      };

      evtSource.onerror = function() {
        console.log('SSE connection lost, reconnecting...');
      };
    })();
    </script>`;

  html = html.replace("</body>", `${sseScript}\n</body>`);
  return html;
}

// ── HTTP server ──────────────────────────────────────────────────────

const server = createServer((req, res) => {
  // Serve the viewer
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getViewerHtml());
    return;
  }

  // API: read the markdown file
  if (req.url === "/api/file") {
    try {
      const content = readFileSync(filePath, "utf-8");
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Error reading file: ${err.message}`);
    }
    return;
  }

  // API: SSE events for live reload
  if (req.url === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: connected\n\n`);
    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  // Serve images relative to the markdown file's directory
  const fileDir = dirname(filePath);
  const requestedPath = resolve(fileDir, req.url.slice(1));
  if (requestedPath.startsWith(fileDir) && existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    const ext = extname(requestedPath).toLowerCase();
    const mimeTypes = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".css": "text/css",
      ".js": "application/javascript",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(readFileSync(requestedPath));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

// ── Start ────────────────────────────────────────────────────────────

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`Markdown viewer: ${url}`);
  console.log(`Watching: ${filePath}`);
  console.log(`Press Ctrl+C to stop.\n`);

  startWatching();

  // Open browser
  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${url}"`);
});

// Clean up on exit
process.on("SIGINT", () => {
  unwatchFile(filePath);
  server.close();
  process.exit(0);
});
