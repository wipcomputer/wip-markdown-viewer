# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two versions of a feature-rich markdown viewer with syntax highlighting, diagrams, math equations, and more:

1. **Web Browser Version** (`markdown-viewer.html`) - Standalone single-file HTML application
2. **BBEdit Preview Template** (`bbedit-preview-template.html`) - Integration for BBEdit's preview system

Both share the same rendering features but differ in file loading and refresh mechanisms.

## Architecture

### Web Browser Version (`markdown-viewer.html` - 1,052 lines)

**Single-file architecture** with embedded CSS and JavaScript:

- **CDN Dependencies**: marked.js (markdown parsing), highlight.js (syntax highlighting), Mermaid (diagrams), KaTeX (math)
- **CSS Variables**: Theme system for light/dark mode (`:root` and `[data-theme="dark"]`)
- **Key Components**:
  - Drop zone UI with "Load File" button (supports drag-and-drop and File System Access API)
  - Viewer container with header controls (TOC, Theme, Load, Refresh, Export, Print)
  - TOC sidebar (collapsible, auto-generated from headings)
  - Markdown content area (styled with GitHub-inspired typography)

**File Loading Flow**:
1. Drag-and-drop OR "Load File" button → `handleDrop()` or `loadNewFile()`
2. `loadFile()` → FileReader reads text → `displayMarkdown()`
3. `displayMarkdown()` → marked.js renders → sanitize HTML → highlight code → render Mermaid/KaTeX → generate TOC

**Auto-Refresh** (Chrome/Edge only):
- Uses File System Access API (`showOpenFilePicker`) to get `fileHandle`
- `checkForChanges()` polls every 2 seconds via `fileHandle.getFile()`
- Compares `lastModified` timestamp and reloads if changed
- Safari/Firefox: No File System Access API, must manually refresh

### BBEdit Preview Template (`bbedit-preview-template.html` - 558 lines)

**Simplified version designed for BBEdit's preview system**:

- **No file loading logic**: BBEdit handles markdown parsing and injects HTML at `#DOCUMENT_CONTENT#` marker
- **Removed**: Drop zone, file buttons, marked.js, File System Access API, file watching
- **Kept**: All rendering (highlight.js, Mermaid, KaTeX), TOC generation, dark mode, export
- **Auto-refresh**: Native BBEdit behavior (updates on save) - no polling needed

**Template Integration**:
1. BBEdit parses markdown → HTML
2. Injects at `#DOCUMENT_CONTENT#` marker in template
3. Template JavaScript runs: syntax highlight → render diagrams/math → generate TOC
4. Updates automatically when file is saved in BBEdit

**Installation**: Copy to `~/Library/Application Support/BBEdit/Preview Templates/`

## Key Features (Both Versions)

- **Syntax highlighting**: highlight.js with auto-detection (180+ languages)
- **Mermaid diagrams**: Renders flowcharts, sequence diagrams, etc. from code blocks
- **Math equations**: KaTeX renders inline `$...$` and display `$$...$$` LaTeX
- **Table of Contents**: Auto-generated from h1-h4, smooth scroll navigation
- **Dark mode**: Toggleable with localStorage persistence, updates highlight.js/Mermaid themes
- **GitHub Flavored Markdown**: Tables, task lists, strikethrough via marked.js GFM mode
- **XSS Protection**: Basic sanitization (removes `<script>`, validates `<iframe>` src)

## Development

### Testing Web Version
```bash
open markdown-viewer.html  # macOS
# or open in any browser
```

Test with `demo/demo.md` which includes examples of all features.

### Testing BBEdit Template
```bash
# Copy template to BBEdit folder
cp bbedit-preview-template.html ~/Library/Application\ Support/BBEdit/Preview\ Templates/

# Open demo in BBEdit
open -a BBEdit demo/demo.md

# Press ⌃⌘P to preview, select template from menu
```

### Making Changes

**When modifying features:**
- Update BOTH files if feature is shared (syntax highlighting, dark mode, TOC, etc.)
- Update only web version for file loading/refresh logic
- Update only BBEdit version for template-specific behavior

**Key areas that differ between versions:**
- Web: Lines 484-520 (drop zone), 579-891 (file loading/watching)
- BBEdit: No file loading, uses `#DOCUMENT_CONTENT#` marker at line 401

**CSS theming:**
- Both use CSS variables (`:root` for light, `[data-theme="dark"]` for dark)
- Changing colors: Update CSS variables at top of `<style>` section
- Highlight.js theme switches via DOM: `document.getElementById('highlight-theme').href = ...`

## Common Tasks

### Adding a new CDN library
Add `<script>` or `<link>` in `<head>` section of both files (after existing CDN includes).

### Updating markdown renderer options
Web version only: Modify `marked.setOptions()` around line 496-509.
BBEdit version: BBEdit handles markdown parsing (cmark/GFM/MultiMarkdown configurable in BBEdit preferences).

### Changing dark mode colors
Update CSS variables in `[data-theme="dark"]` block (lines 34-47 in web version, similar in BBEdit).

### Modifying TOC generation
Both files: `generateTOC()` function queries `h1-h4` and builds sidebar list with smooth scroll.

## Repository Structure

```
.
├── markdown-viewer.html           # Web browser version
├── bbedit-preview-template.html   # BBEdit preview template
├── demo/
│   ├── demo.md                    # Feature demonstration file
│   └── demo-image.png             # Test image (referenced in demo.md)
├── images/                        # Screenshots for README
├── README.md                      # User documentation (installation, usage)
├── LICENSE                        # MIT License
└── CLAUDE.md                      # This file
```

## Server Version (`server.js` / `mdview` CLI)

### Opening Files

The URL parameter is `?path=` (NOT `?file=`):

```bash
# Correct
open "http://127.0.0.1:3000/view?path=/absolute/path/to/file.md"

# WRONG — will show blank page
open "http://127.0.0.1:3000/view?file=/absolute/path/to/file.md"
```

### Starting the Server

```bash
mdview                         # Start on port 3000
mdview --port 8080             # Custom port
mdview --root /path/to/dir     # Restrict file access
```

### Typical AI Agent Workflow

```bash
# 1. Start server if not running
curl -s http://127.0.0.1:3000/ > /dev/null 2>&1 || mdview &

# 2. Open a file
open "http://127.0.0.1:3000/view?path=/absolute/path/to/file.md"

# 3. Edit the file — browser updates live, no refresh needed
```

## Important Notes

- **No build process**: Files are standalone HTML, edit and refresh
- **Image paths in markdown**: Relative to markdown file location (BBEdit resolves correctly)
- **Browser compatibility**: Auto-refresh requires File System Access API (Chrome/Edge/Opera only)
- **BBEdit markdown parsers**: Users can choose cmark, GFM, MultiMarkdown, or Pandoc in BBEdit preferences