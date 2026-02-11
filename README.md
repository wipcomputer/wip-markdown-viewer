# Markdown Viewer

A lightweight markdown viewer with live reload. Works in all browsers including Safari.

## Features

- **Syntax Highlighting**: 180+ languages supported via highlight.js
- **Dark Mode**: toggle between light and dark themes
- **Table of Contents**: auto-generated navigation for long documents
- **GitHub Flavored Markdown**: tables, task lists, and strikethrough
- **Mermaid Diagrams**: flowcharts, sequence diagrams, and more
- **Math Equations**: KaTeX rendering for LaTeX expressions
- **Print Support**: print-optimized layouts
- **Export HTML**: save as standalone HTML file
- **Live Reload**: auto-refreshes on file save (all browsers)

## Usage

### Local server (recommended)

The easiest way. Works in every browser with live reload.

```bash
npx @wipcomputer/markdown-viewer /path/to/file.md
```

Or install globally:

```bash
npm install -g @wipcomputer/markdown-viewer
mdview /path/to/file.md
```

Opens your browser, watches the file, auto-refreshes on save. Ctrl+C to stop.

Options:

```bash
mdview --port 8080 /path/to/file.md    # Custom port (default: 3000)
```

### Static HTML (no install)

Open `markdown-viewer.html` directly in your browser:

1. Open `markdown-viewer.html` in any browser
2. Drag and drop a `.md` file, or click "Load File"
3. Auto-refresh only works in Chrome/Edge (File System Access API). Safari/Firefox need manual refresh.

### BBEdit Preview Template

For BBEdit users with true auto-refresh on save:

1. In Finder, press `Shift+Cmd+G` and paste: `~/Library/Application Support/BBEdit/Preview Templates/`
2. Copy `bbedit-preview-template.html` to this folder
3. In BBEdit, open any `.md` file and press `Ctrl+Cmd+P`
4. Select `bbedit-preview-template.html` from the Templates menu

## Demo

Load `demo/demo.md` to see all features in action.

![Landing Page](images/01.png)

![Light Mode View](images/02.png)

![Dark Mode View](images/03.png)

## License

MIT

---

Built collaboratively by Parker Todd Brooks, Lēsa (OpenClaw agent), and Claude Code (CLI).
