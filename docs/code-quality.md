# Code Quality Review

## Functional vs Vacuous

Functional:

- `wrap` runs a command, preserves exit code, and writes metadata.
- `privacy audit` recursively scans for publish blockers.
- `presence` writes and reads local state.
- `handoff` writes Markdown or previews JSON.
- `pr-watch` inspects local git and optional GitHub PR state.
- `dashboard` now launches a Next.js app with API-backed buttons.
- `mission`, `replay`, and `tui` derive real state from presence, wrapper events, health checks, analytics, and PR probes.
- Dashboard feature actions are now backed by `/api/actions`; bot dry-run, statusline preview, bridge create-only, and wrapper smoke return visible action results instead of copying commands.

Thin but useful:

- `analytics` and `statusline` summarize local wrapper state.
- `bot` is meaningful as a dry-run by default; the send path still depends on the public Shellbook CLI.

Still integration-heavy:

- `pr-watch` still needs more valid/invalid GitHub CLI branch tests.

## CRAP Risk

The riskiest areas are still modules with external processes or server lifecycle behavior:

- `src/cli.ts`: higher branch count and only partial CLI integration coverage.
- `src/dashboard/server.ts`: server lifecycle is simple, but needs tmux/runtime smoke coverage.
- `src/lib/bridge.ts` and `src/lib/doctor.ts`: depend on tmux, Shellbook, and local machine state.
- `src/services/dashboard-service.ts`: Effect-backed, but still a thin composition seam rather than full Context/Layer injection.
- `src/lib/ops.ts` and `src/lib/tui.ts`: new user-facing surfaces, now covered for stale state, redacted replay output, bounded limits, and invalid view handling.

Risk reduced in this pass:

- Dashboard routes now exist for every server-backed visible action.
- Dashboard action IDs, command labels, side-effect levels, next steps, and runners are derived from one typed registry.
- Local-only dashboard actions require an explicit `confirmLocalOnly: true` API request.
- Malformed presence POST bodies now fail with HTTP 400 instead of marking the agent available.
- `npm test` now enforces at least 85% line coverage instead of relying on a human to read the coverage table.
- CLI boolean flag parsing is covered, including `--json`, `--version`, missing command, and invalid command paths.
- CLI numeric flags now reject invalid, zero, negative, and out-of-range values where the value controls ports, timeouts, byte limits, replay limits, or TUI width.
- Dashboard server start mode, bridge tmux behavior, doctor prerequisite checks, handoff JSON/Markdown, and output formatting now have focused tests.
- `wrap` exit code behavior is locked with a regression test.
- `statusline` duplicate output is locked with a regression test.
- Corrupt JSONL event lines no longer discard all historical events.
- GitHub PR JSON parsing no longer throws through `pr-watch`.
- A native SwiftUI app now consumes the same local API boundary and has simulator build/test/runtime QA.
- Replay display surfaces redact key-shaped argv values before they reach CLI JSON, the TUI, the dashboard, or API clients.
- Mission Control marks old successful runs stale and shows last-run age rather than presenting old proof as current.
- Dashboard primary action buttons use the same loading keys as panel buttons, reducing duplicate request risk.

## Code Smells

- Existing CLI libraries still use repeated `execFile` wrappers. A future pass should introduce `ShellbookClient`, `GitClient`, `GhClient`, and `TmuxClient` adapters.
- API handlers intentionally degrade most domain failures into JSON payloads for the dashboard. Unexpected route failures should later get consistent `4xx` and `5xx` envelopes.
- shadcn-style primitives are local copies, not generated components from the CLI. They follow the conventions but are not a complete design system.
- DTO typing is still looser than ideal at the `CommandResult.data` seam. A future pass should add typed payloads or schemas for PR and snapshot data.

## DRY Review

Fixed:

- Dashboard feature panels now derive id, command, name, and summary from the canonical `modules` list.
- Panel actions are represented as registry metadata and dispatched through one action helper.
- Copy-only command panels were replaced with typed server-backed action payloads and reusable action-result UI.
- Mission Control and replay state are derived once in `src/lib/ops.ts` and reused by CLI, TUI, and the Next dashboard service.

Remaining:

- README and architecture docs still describe the same ten modules in prose. That duplication is acceptable documentation, but command IDs should stay code-derived.
- External-process handling still duplicates timeout and error shaping across several library modules.
