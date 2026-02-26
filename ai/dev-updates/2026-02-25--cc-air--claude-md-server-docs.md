# 2026-02-25 — CLAUDE.md: Add Server URL Format

**Agent:** cc-air
**Repo:** `wip-markdown-viewer`
**Branch:** `cc-mba/dev`

## What Happened

Installed mdview globally and tried to open a markdown file in Chrome. Used `?file=` as the query parameter — got a blank page. The correct parameter is `?path=`.

The README and SKILL.md both document `?path=` correctly, but CLAUDE.md (the file AI agents actually read) didn't mention the server at all. So I guessed wrong.

## What Changed

Updated CLAUDE.md with:
- The correct URL format: `/view?path=/absolute/path/to/file.md`
- An explicit "WRONG" example showing `?file=` produces a blank page
- Server startup commands (`mdview`, `--port`, `--root`)
- Typical AI agent workflow (start server if not running, open file, edit live)

## Why It Matters

CLAUDE.md is the first thing any AI agent reads when working with this repo. If the server URL format isn't there, every agent will guess — and `?file=` is a reasonable guess that fails silently (blank page, no error).
