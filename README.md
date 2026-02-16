###### WIP Computer
# Live .md Viewer

Live markdown viewer for AI pair-editing. When you collaborate, the updates render instantly. Works with any AI agent and web browser.

## How It Works

1. Tell your AI coding tool to install `@wipcomputer/markdown-viewer` globally
2. Tell your AI to open the demo.md (or any .md) in md view
3. AI will open the file in your default browser
4. Every save re-renders the page instantly. No refresh needed.

Open multiple tabs to work on multiple documents at once.

## Install

### For AI Agents

Open your AI coding tool and say:

```
Install @wipcomputer/markdown-viewer globally,
start mdview, and add live viewer support to this project.
```

Your AI will install the package, start the server, and add the right instructions to your project so it knows to open the viewer whenever you edit markdown together. That's it.

### npm

```bash
npm install -g @wipcomputer/markdown-viewer
mdview
```

That's it. Global install gives you the `mdview` command anywhere.

### From source

```bash
git clone https://github.com/wipcomputer/wip-markdown-viewer.git
cd wip-markdown-viewer
npm install
node server.js
```

Server starts at `http://127.0.0.1:3000`. Open any markdown file:

```
http://127.0.0.1:3000/view?path=/absolute/path/to/your/file.md
```


## Supported Tools

This works with any AI agent that can run shell commands and edit files.

| Tool | Instruction file | How to add support |
|------|-----------------|-------------------|
| Claude Code | `CLAUDE.md` | Add the snippet below to your project's `CLAUDE.md` |
| OpenAI Codex CLI | `AGENTS.md` | Add the snippet below to your project's `AGENTS.md` |
| Cursor | `.cursorrules` | Add the snippet below to `.cursorrules` |
| Windsurf | `.windsurfrules` | Add the snippet below to `.windsurfrules` |
| OpenClaw | `SKILL.md` | Install the `live-viewer` skill |
| Any other agent | Whatever config it reads | Add the snippet below |

If your tool reads a project-level instruction file... it works. The snippet is the same for all of them.

## Features

- **Live reload:** SSE-powered, works in all browsers including Safari
- **Multi-file:** each tab watches its own file independently
- **GitHub Flavored Markdown:** tables, task lists, strikethrough
- **Syntax highlighting:** 180+ languages via highlight.js
- **Dark mode:** light and dark themes
- **Table of contents:** auto-generated from headings
- **Mermaid diagrams:** flowcharts, sequence diagrams, and more
- **Math equations:** KaTeX rendering for LaTeX

## For AI Agents

Everything below is for you, the AI agent. The human doesn't need to read this. When the user asks you to set up the live markdown viewer, follow these steps.

### Step 1. Start the Server

If installed globally via npm (`npm install -g @wipcomputer/markdown-viewer`):

```bash
curl -s http://127.0.0.1:3000/ > /dev/null 2>&1 || mdview &
```

Or if cloned from source, resolve the full path and start the server:

```bash
curl -s http://127.0.0.1:3000/ > /dev/null 2>&1 || node {absolute path to wip-markdown-viewer}/server.js &
```

The server runs at `http://127.0.0.1:3000` and stays running in the background. Note: the server doesn't survive reboots or long idle periods. The check above starts it only if it's not already running.

### Step 2. Add the Snippet to Your Project

Add the following to whatever instruction file your tool uses (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.windsurfrules`, or equivalent). The content is the same regardless of the file:

```markdown
## Live Markdown Viewer

When editing a .md file, check the server is running and open it in the viewer:

  curl -s http://127.0.0.1:3000/ > /dev/null 2>&1 || node {path to server.js} &
  open "http://127.0.0.1:3000/view?path={absolute path to the file}"

Then make your edits. The user sees every change as you write. No refresh needed.
Do this every time you edit a markdown file.
```

### Step 3. Every Time You Edit Markdown

1. Run: `open "http://127.0.0.1:3000/view?path={absolute path to the file}"`
2. Edit the file
3. The user sees it update live in their browser

That's it. The server watches the file and pushes updates via SSE. You don't need to do anything else.

### Notes

- The `open` command works on macOS. On Linux use `xdg-open`. On Windows use `start`.
- Each file gets its own URL. Multiple files can be viewed in separate tabs.
- The server reads the file fresh on every change. No caching.
- If the server isn't running, start it. It doesn't need any arguments.

---

## License

MIT

Built by Parker Todd Brooks, with Claude Code and Lēsa (OpenClaw).
