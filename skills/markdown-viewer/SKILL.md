---
name: markdown-viewer
description: Live markdown viewer for AI pair-editing. When you collaborate, the updates render instantly. Works with any AI agent and web browser.
homepage: https://github.com/wipcomputer/wip-markdown-viewer
metadata:
  {
    "openclaw":
      {
        "emoji": "📝",
        "requires": { "bins": ["node"] },
        "install":
          [
            {
              "id": "npm",
              "kind": "npm",
              "package": "@wipcomputer/markdown-viewer",
              "global": true,
              "bins": ["mdview"],
              "label": "Install markdown-viewer (npm)",
            },
          ],
      },
  }
---

# Live Markdown Viewer

See your documents update in real time as your AI edits them.

## Quick start

Start the server:

```bash
curl -s http://127.0.0.1:3000/ > /dev/null 2>&1 || mdview &
```

Open a file:

```bash
open "http://127.0.0.1:3000/view?path=/absolute/path/to/file.md"
```

## How it works

1. Tell your AI coding tool to install `@wipcomputer/markdown-viewer` globally
2. Tell your AI to open a .md file in md view
3. AI opens the file in your default browser
4. Every save re-renders the page instantly. No refresh needed.

Open multiple tabs to work on multiple documents at once.

## Features

- SSE-powered live reload (works in Safari, Chrome, Firefox)
- Multi-file support (each tab watches its own file)
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- Syntax highlighting (180+ languages)
- Dark mode
- Table of contents
- Mermaid diagrams
- KaTeX math equations

## Notes

- The `open` command works on macOS. On Linux use `xdg-open`. On Windows use `start`.
- Server runs at `http://127.0.0.1:3000` by default. Use `mdview --port 8080` to change.
- Zero npm dependencies. Pure Node.js.
