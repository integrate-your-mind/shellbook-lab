# Code Quality Review

## Functional vs Vacuous

Functional:

- `wrap` runs a command, preserves exit code, and writes metadata.
- `privacy audit` recursively scans for publish blockers.
- `presence` writes and reads local state.
- `handoff` writes Markdown or previews JSON.
- `pr-watch` inspects local git and optional GitHub PR state.
- `dashboard` now launches a Next.js app with API-backed buttons.

Thin but useful:

- `analytics` and `statusline` summarize local wrapper state.
- `bot` is meaningful as a dry-run by default; the send path still depends on the public Shellbook CLI.

Still integration-heavy:

- `bridge`, `doctor`, and external-process paths need more missing-binary and timeout tests.

## CRAP Risk

The riskiest areas are still modules with external processes or server lifecycle behavior:

- `src/cli.ts`: higher branch count and only partial CLI integration coverage.
- `src/dashboard/server.ts`: server lifecycle is simple, but needs tmux/runtime smoke coverage.
- `src/lib/bridge.ts` and `src/lib/doctor.ts`: depend on tmux, Shellbook, and local machine state.
- `src/services/dashboard-service.ts`: Effect-backed, but still a thin composition seam rather than full Context/Layer injection.

Risk reduced in this pass:

- Dashboard routes now exist for every server-backed visible action.
- `wrap` exit code behavior is locked with a regression test.
- `statusline` duplicate output is locked with a regression test.
- Corrupt JSONL event lines no longer discard all historical events.
- GitHub PR JSON parsing no longer throws through `pr-watch`.

## Code Smells

- Existing CLI libraries still use repeated `execFile` wrappers. A future pass should introduce `ShellbookClient`, `GitClient`, `GhClient`, and `TmuxClient` adapters.
- API handlers intentionally degrade most domain failures into JSON payloads for the dashboard. Unexpected route failures should later get consistent `4xx` and `5xx` envelopes.
- shadcn-style primitives are local copies, not generated components from the CLI. They follow the conventions but are not a complete design system.

## DRY Review

Fixed:

- Dashboard feature panels now derive id, command, name, and summary from the canonical `modules` list.
- Panel actions are represented as registry metadata and dispatched through one action helper.

Remaining:

- README and architecture docs still describe the same ten modules in prose. That duplication is acceptable documentation, but command IDs should stay code-derived.
- External-process handling still duplicates timeout and error shaping across several library modules.
