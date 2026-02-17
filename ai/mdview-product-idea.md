# MD View — Ephemeral Live Publishing

**Date:** February 17, 2026
**Origin:** Parker, during Dream Weaver paper review

## Domain

`mdview.wip.computer`

## The Product

MD View is a markdown viewer with two modes:

1. **Local mode** (MIT, open source) — free forever, run locally
2. **Cloud mode** (AGPL + commercial license) — paid ephemeral sharing service

## Licensing Strategy — Dual License

### MIT — Local Viewer
- The local markdown viewer: install, run, modify, ship
- Everything needed to view markdown files locally
- MIT licensed, no restrictions

### AGPL — Cloud/Server Components
- The share infrastructure: Workers, auth, publishing, ephemeral URLs
- AGPL means: if you copy the server code and run it as a service, you must open source your entire stack
- **Or** you license it commercially from WIP
- This closes the SaaS loophole (AGPL triggers on network use, not just distribution)
- Protects against someone cloning the service without licensing

### The Model
- Fork the viewer → build your own local tool → **totally fine, MIT**
- Copy the cloud service and run your own competing mdview hosting → **AGPL: open source everything, or pay for a commercial license**
- This is the MongoDB/Redis open-core model

## Website (mdview.wip.computer)

Simple landing page:
- What MD View is
- How to install locally (MIT, open source, GitHub link)
- Sign up for the cloud service (share button in the viewer)

## Business Model

### Free Tier
- Install locally from GitHub (MIT, free forever)
- Local viewing, live reload, all current features
- **10 free shares** when you sign up for a cloud account
- Each share = publish a doc to a live URL, share with anyone, ephemeral

### Paid Tier — $1/month
- Unlimited shares
- Same ephemeral model: live while you're working, dies after 15 min inactivity
- URL is one-time, never reusable

## How Sharing Works

1. User installs MD View (local or via cloud service)
2. They log in to their cloud account
3. When viewing a document, there's a **Share button**
4. Click Share → document publishes to `mdview.wip.computer/<user>/<hex-id>`
5. Live, real-time updates as they edit locally
6. 15 min inactivity → URL dies permanently
7. Free users get 10 shares. After that → $1/month.

## Architecture

- **Local viewer:** Current mdview (open source, MIT)
- **Cloud service:** Cloudflare Workers (edge, global, fast) — AGPL
- **Share flow:** Local mdview → authenticates → pushes to Worker → live URL
- **Paid mode:** Share button appears in viewer when logged in

## Repo Structure

- **Public repo** (MIT) — the viewer, open source, anyone can use
- **Private repo** (AGPL + commercial) — cloud service, Workers, auth, share infra
- MIT repo never contains paid service code. Clean separation.
- `ai/` folder in repos = internal product thinking (private, not part of MIT)

## What Changes in the Viewer (Paid Mode)

- Add **Share button** (only visible when logged in to cloud account)
- Share button publishes current doc to the cloud service
- Free: 10 shares, then prompts to upgrade
- Paid ($1/mo): unlimited shares

## Why This Works

- Open source core (MIT) = adoption, trust, community
- Cloud sharing is the premium = convenience, not gatekeeping
- $1/month is impulse pricing — no friction
- 10 free shares = try before you buy
- Ephemeral = no hosting costs pile up, no stale content
- AGPL on server = protection against service clones without licensing
- Dual license = commercial option for enterprises who can't do AGPL

## Open Questions

- Auth mechanism (GitHub OAuth? email? magic link?)
- Image handling (proxy through worker? base64 inline?)
- Timer duration configurable or fixed at 15 min?
- Max concurrent shares per account?
- Exact repo names and org structure
- When to fork and set up the private repo
