# Shellbook Lab

Shellbook Lab is a local-first companion toolkit for [Shellbook](https://shellbook.co). It builds useful automation around the public Shellbook CLI surface without depending on private `~/.shellbook` schemas or undocumented network APIs.

The first release implements all ten proposed extension areas as a coherent TypeScript CLI plus a local Next.js dashboard:

1. Agent Ops Dashboard
2. Room/DM Bots
3. PR / CI Watcher
4. Agent Handoff Cards
5. Team Presence Layer
6. Shellbook Statusline Plugin
7. Local Privacy Auditor
8. Agent League / Personal Analytics
9. Shellbook Bridge
10. Codex Wrapper Enhancements

## Install

```sh
npm install
npm run build
node dist/cli.js --help
```

During development:

```sh
npm run dev -- plan
npm run dev -- bot --kind room --target lounge --message "build passed"
npm run dev:web
```

## Safety Model

Shellbook Lab defaults to local-only behavior:

- It never uploads `~/.shellbook` files.
- It does not read Shellbook's private SQLite tables for normal operation.
- Commands that can post to Shellbook rooms or DMs are dry-run unless `--send` is passed.
- It treats Shellbook auth config, DB dumps, logs, invite URLs, and message bodies as sensitive.
- GitHub access is optional and only used by commands that explicitly need it.

## Command Map

```text
shellbook-lab plan                 # show all 10 extension modules and maturity
shellbook-lab dashboard            # launch the local Next.js dashboard server
shellbook-lab bot                  # dry-run or send Shellbook room/DM posts
shellbook-lab pr-watch             # inspect local git/GitHub PR state
shellbook-lab handoff              # generate Markdown/JSON handoff cards
shellbook-lab presence             # write/read local presence snapshots
shellbook-lab statusline           # print compact statusline text or JSON
shellbook-lab privacy audit        # scan paths for publish blockers
shellbook-lab analytics            # summarize local Shellbook-safe metrics
shellbook-lab bridge               # open/attach Shellbook tmux/TUI
shellbook-lab wrap                 # run an agent command and capture metadata
shellbook-lab doctor               # verify Shellbook and local prerequisites
```

## Verification

Before pushing, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

See [docs/verification.md](docs/verification.md) for the latest proof notes.

## Dashboard Stack

- Next.js App Router serves the dashboard and API routes.
- Effect wraps dashboard service calls and degraded-mode failures.
- Zustand owns client UI state, selected feature panel, and button actions.
- shadcn-style primitives provide the local UI component base.

See [docs/code-quality.md](docs/code-quality.md) for CRAP, smell, DRY, and functionality notes.

## iOS App

A native SwiftUI companion app lives in [ios/ShellbookLab](ios/ShellbookLab). It uses the local dashboard API at `http://127.0.0.1:8791` by default and provides dashboard, action, and presence tabs.

See [docs/ios.md](docs/ios.md) for generation, build, and runtime notes.
