# WIP Computer — Live MD Viewer

A real-time markdown viewer that auto-updates in the browser when an AI or editor saves to disk. Drop a file or pick one — changes appear instantly with no refresh needed.

## Features

- **Syntax Highlighting**: 180+ languages supported via highlight.js
- **Dark Mode**: toggle between light and dark themes
- **Table of Contents**: auto-generated navigation for long documents
- **GitHub Flavored Markdown**: tables, task lists, and strikethrough
- **Mermaid Diagrams**: flowcharts, sequence diagrams, and more
- **Math Equations**: KaTeX rendering for LaTeX expressions
- **Live Reload**: auto-refreshes via SSE when the file changes on disk
- **Multi-file**: open multiple tabs, each watching a different file
- **Print Support**: print-optimized layouts

## Usage

### Start the server

```bash
node server.js
```

Opens http://127.0.0.1:3000/ — pick a file from the homepage or drag and drop. The file renders with live reload via SSE. Open multiple tabs to watch multiple files at once.

```bash
node server.js --port 8080    # Custom port
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
