# WIP Computer — Live MD Viewer

See your markdown update in real time as you and your AI edit together.

Open a README, a project doc, or any `.md` file in the viewer — then keep working on it in your editor or with an AI agent like Claude Code, Cursor, or Copilot. Every save hits the browser instantly. No refresh, no rebuild, no waiting.

## Why

You're writing a README with Claude Code. Or pair-editing a design doc with Cursor. Or reviewing changes an agent just made to your project docs. You want to *see* the markdown rendered — live — as it's being written.

That's what this does. Start the server, open your file, and watch it update as the AI works.

## Quick Start

```bash
node server.js
```

Opens http://127.0.0.1:3000/. Pick a file or drag one in. Done.

## How It Works

1. Open a `.md` file in the viewer
2. The server watches the file on disk (500ms polling)
3. When the file changes — you saved, your AI saved, anything saved — the server pushes an update via SSE
4. The browser re-renders instantly, preserving your scroll position

Open multiple tabs to watch multiple files at the same time.

## Features

- **Live reload** — SSE-powered, works in all browsers including Safari
- **Multi-file** — each tab watches its own file independently
- **GitHub Flavored Markdown** — tables, task lists, strikethrough
- **Syntax highlighting** — 180+ languages via highlight.js
- **Dark mode** — light and dark themes
- **Table of contents** — auto-generated from headings
- **Mermaid diagrams** — flowcharts, sequence diagrams, and more
- **Math equations** — KaTeX rendering for LaTeX
- **Drag and drop** — works without the server too (no live reload)

## Options

```bash
node server.js --port 8080    # Custom port (default: 3000)
```

## Use Cases

- **AI pair editing** — watch your README render live while Claude Code, Cursor, or Copilot edits it
- **Documentation review** — open a doc an agent just updated and see exactly what changed
- **Writing** — draft markdown with instant visual feedback
- **Presentations** — live-edit slides or docs while sharing your screen

## License

MIT

---

Built by Parker Todd Brooks, with Claude Code.
