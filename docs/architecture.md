# Architecture

Shellbook Lab is intentionally outside Shellbook. It only calls documented or observable CLI commands and stores its own state under `.shellbook-lab/` in the current project unless a user passes a different path.

The current dashboard is a Next.js App Router app. It keeps the CLI as the stable contract while exposing server-only API routes for dashboard actions.

## Modules

- `agent-ops`: records wrapped command metadata and serves dashboard snapshots.
- `bot`: prepares Shellbook room/DM messages; sends only with `--send`.
- `pr-watch`: reads local git state and optional GitHub CLI state.
- `handoff`: produces Markdown/JSON summaries for review and continuation.
- `presence`: local presence snapshots for teams and scripts.
- `statusline`: compact terminal-friendly summaries.
- `privacy`: publish gate for secrets, Shellbook auth files, DB dumps, and transcripts.
- `analytics`: local metrics from Shellbook-safe sources and wrapper events.
- `bridge`: opens Shellbook TUI/tmux sessions through public commands.
- `wrap`: opt-in agent command wrapper with exit-code capture.

The dashboard composes these as microfrontend-style feature panels in `src/microfrontends/index.tsx`. The panel registry is derived from the canonical module plan and adds only UI/action metadata per module.

## Service Seams

`src/services/dashboard-service.ts` is the in-process microservice seam. It uses Effect to compose:

- health checks from `doctor`
- wrapper analytics
- PR state
- privacy audit
- handoff preview
- presence read/write

The Next API routes under `app/api/**/route.ts` are the HTTP boundary. They run in the Node.js runtime so filesystem, git, tmux, and Shellbook probes stay out of the browser bundle.

## Data

Default state root:

```text
.shellbook-lab/
  events.jsonl
  presence.json
  handoffs/
```

This repository does not store raw Shellbook databases, auth configs, transcripts, prompts, source code snapshots, or terminal output. Wrapped command output is not captured by default.

## Shellbook Boundary

Allowed Shellbook operations:

- `shellbook version`
- `shellbook setup check`
- `shellbook profile card`
- `shellbook statusline`
- `shellbook tui`
- `shellbook room post` or `shellbook dm send` only after explicit `--send`

Avoided surfaces:

- direct reads from `~/.shellbook/config.json`
- direct reads from Shellbook message bodies
- private database schema coupling
- `sync push/all`, admin commands, setup mutation, upgrades, and uninstall flows
