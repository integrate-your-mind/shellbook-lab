# Verification Notes

Verification gates for this repository:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Current local proof after the Shellbook Labs TUI, Mission Control, and replay pass:

- `npm run lint` passed with the custom repository lint gate.
- `npm run typecheck` passed with TypeScript strict mode.
- `npm test` passed 34 Node test-runner tests after running `next build --webpack` and `tsc -p tsconfig.cli.json`.
- `npm test` now enforces `--test-coverage-lines=85`; the current full run reported 90.12% line coverage.
- `npm run build` passed before browser and simulator QA.
- The web style gate verifies the built Next CSS contains the Tailwind dashboard utilities after explicit `@source` registration in `app/globals.css`.
- Dashboard HTTP `/api/snapshot` returned `@bunny`, 10 modules, 1 mission, and 0 replay frames on the running local server.
- `POST /api/presence` rejects invalid statuses with HTTP 400 and accepts `available`.
- Runtime privacy audit passed with no blockers across 111 source files after excluding generated build output.
- Browser QA loaded the dashboard, found all 10 feature panels, exercised privacy audit, handoff preview, and presence update actions, checked a 390px mobile viewport, verified no horizontal overflow, verified active Tailwind styles, and observed zero console warnings/errors.
- CLI/TUI checks covered normal, failure, and odd paths: TUI render, mission/replay JSON, invalid `--limit`, invalid TUI view, degraded replay health, redacted replay argv, stale mission state, and presence fallback.
- iOS simulator QA passed from a `/tmp` project copy with `xcodebuild -project ... test`: 3 unit tests, 0 failures. This reproduces the Documents path workaround and proves the test target now generates its Info.plist.
- iOS simulator launch passed with `xcodebuildmcp build_run_sim` against the same `/tmp` project copy; runtime screenshot verified Dashboard with `@bunny`, ready health, local presence, metrics, and tabs.
- macOS SwiftPM QA passed with `npm run mac:test`: 6 tests, 0 failures.
- macOS launch verification passed with `./script/build_and_run.sh --verify`; it staged `dist/ShellbookLabMac.app`, launched it, and verified the `ShellbookLabMac` process.
- macOS window placement was verified with CoreGraphics window metadata: Shellbook Lab opened at negative x (`x=-2829` in the latest run), on the leftmost external display instead of the Built-in Retina Display at `x=0`.

Screenshots from the latest QA pass:

- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-tui-mission-dashboard.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-tui-mission-mobile.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-tui-mission-qa.jpg`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-current-qa.jpg`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-css-before.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-css-after.png`

Manual Shellbook checks performed before scaffolding:

- `shellbook version` returned `shellbook 0.2.27`
- `shellbook setup check` reported `identity: ok @bunny`
- Shellbook TUI opened in tmux session `shellbook-chat`

Known gaps:

- No Shellbook-native room/DM API is documented, so bot sending uses the public CLI only and is dry-run by default.
- No direct Shellbook DB parsing is used; analytics are based on wrapper events and public command output.
- GitHub PR watcher uses local git/gh evidence when available and degrades cleanly without a repo or token.
- PR watcher branch coverage is still low around valid/invalid GitHub CLI JSON.
- Browser QA covered Chromium/in-app Browser only, not Safari or Firefox. In the latest pass, Browser screenshot capture timed out at the CDP capture step, so current web proof used DOM, API, computed-style, console, and interaction evidence plus existing screenshot artifacts.
- iOS project loading under the repository's Documents path blocked in macOS `NSFileCoordinator`; iOS builds/tests were verified from a `/tmp` copy of the generated project with identical sources.
- `CommandResult.data` and `DashboardSnapshot.pr` remain weakly typed seams; a future pass should add DTO schemas or golden JSON contract tests.
