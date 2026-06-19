# Verification Notes

Verification gates for this repository:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Current local proof after the Shellbook Labs TUI, Mission Control, and replay pass:

- `npm run lint` passed with the custom repository lint gate.
- `npm run typecheck` passed with TypeScript strict mode.
- `npm test` passed 32 Node test-runner tests after running `next build --webpack` and `tsc -p tsconfig.cli.json`.
- `npm test` now enforces `--test-coverage-lines=85`; the current full run reported 89.97% line coverage.
- `npm run build` passed before browser and simulator QA.
- Dashboard HTTP `/api/snapshot` returned `@bunny`, 10 modules, 1 mission, and 0 replay frames on the running local server.
- `POST /api/presence` rejects invalid statuses with HTTP 400 and accepts `available`.
- Runtime privacy audit passed with no blockers across 88 source files after excluding generated build output.
- Browser QA loaded the dashboard, found all 10 feature panels, clicked each top-level action, checked desktop and mobile viewports, verified no horizontal overflow, and observed zero console warnings/errors.
- CLI/TUI checks covered normal, failure, and odd paths: TUI render, mission/replay JSON, invalid `--limit`, invalid TUI view, degraded replay health, redacted replay argv, stale mission state, and presence fallback.
- iOS simulator QA passed with `xcodebuildmcp test_sim`: 3 unit tests, 0 failures.
- iOS simulator launch passed with `xcodebuildmcp build_run_sim`; runtime snapshot verified Dashboard with `@bunny`, ready health, local presence, metrics, and tabs.

Screenshots from the latest QA pass:

- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-tui-mission-dashboard.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-tui-mission-mobile.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-tui-mission-qa.jpg`

Manual Shellbook checks performed before scaffolding:

- `shellbook version` returned `shellbook 0.2.27`
- `shellbook setup check` reported `identity: ok @bunny`
- Shellbook TUI opened in tmux session `shellbook-chat`

Known gaps:

- No Shellbook-native room/DM API is documented, so bot sending uses the public CLI only and is dry-run by default.
- No direct Shellbook DB parsing is used; analytics are based on wrapper events and public command output.
- GitHub PR watcher uses local git/gh evidence when available and degrades cleanly without a repo or token.
- PR watcher branch coverage is still low around valid/invalid GitHub CLI JSON.
- Browser QA covered Chromium/in-app Browser only, not Safari or Firefox.
- iOS project loading under the repository's Documents path blocked in macOS `NSFileCoordinator`; iOS builds/tests were verified from a `/tmp` copy of the generated project with identical sources.
- `CommandResult.data` and `DashboardSnapshot.pr` remain weakly typed seams; a future pass should add DTO schemas or golden JSON contract tests.
