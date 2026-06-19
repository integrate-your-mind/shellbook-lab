# Verification Notes

Verification gates for this repository:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Current local proof after replacing copy-only dashboard actions with backed actions:

- `npm run lint` passed with the custom repository lint gate.
- `npm run typecheck` passed with TypeScript strict mode.
- `npm run build` passed with `next build --webpack` and `tsc -p tsconfig.cli.json`.
- `npm test` passed 40 Node test-runner tests after running the production build.
- `npm test` enforces `--test-coverage-lines=85`; the current full run reported 91.47% line coverage.
- The web style gate verifies the built Next CSS contains the Tailwind dashboard utilities after explicit `@source` registration in `app/globals.css`.
- Dashboard HTTP `/api/snapshot` returned `@bunny`, 10 modules, and local metrics from the running production server.
- `POST /api/actions` returns backed action payloads for bot dry-run, statusline preview, bridge create-only, and wrapper smoke.
- `POST /api/actions` rejects unconfirmed local-only actions with HTTP 409.
- `POST /api/presence` rejects malformed JSON with HTTP 400 instead of mutating presence state.
- Runtime privacy audit passed with no blockers across 113 source files after excluding generated build output.
- Browser QA loaded the dashboard, found all 10 feature panels, exercised every primary action, checked a 390px mobile viewport, verified no horizontal overflow, verified active Tailwind styles, and observed zero console warnings/errors.
- Browser QA proved wrapper smoke writes replay metadata that Analytics and Agent Ops consume after refresh.
- CLI/TUI checks covered normal, failure, and odd paths: TUI render, mission/replay JSON, invalid `--limit`, invalid TUI view, degraded replay health, redacted replay argv, stale mission state, and presence fallback.
- XcodeBuildMCP discovered the iOS project, and direct project metadata confirmed the `ShellbookLab` scheme and generated Info.plist settings. Simulator build/test was not completed in this pass because both XcodeBuildMCP `list_schemes` and direct `xcodebuild -list` hung.
- macOS SwiftPM QA passed with `npm run mac:test`: 6 tests, 0 failures.
- macOS SwiftPM build passed with `npm run mac:build`.

Screenshots from the latest QA pass:

- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-tui-mission-dashboard.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-tui-mission-mobile.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-tui-mission-qa.jpg`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-current-qa.jpg`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-css-before.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-css-after.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-functional-desktop.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-action-result.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-functional-mobile.png`

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
- iOS simulator build/test is currently unproven in this workspace because scheme discovery hung through both XcodeBuildMCP and direct `xcodebuild -list`.
- `CommandResult.data` and `DashboardSnapshot.pr` remain weakly typed seams; a future pass should add DTO schemas or golden JSON contract tests.
