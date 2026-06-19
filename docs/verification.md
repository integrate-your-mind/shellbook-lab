# Verification Notes

Verification gates for this repository:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Current local proof after the coverage and iOS pass:

- `npm run lint` passed with the custom repository lint gate.
- `npm run typecheck` passed with TypeScript strict mode.
- `npm test` passed 25 Node test-runner tests after running `next build --webpack` and `tsc -p tsconfig.cli.json`.
- Node's experimental coverage report showed 91.38% line coverage across loaded compiled modules.
- `npm run build` passed again after the coverage run.
- Dashboard HTTP checks passed for `/`, `/api/snapshot`, `/api/privacy`, `/api/handoff-preview`, and `/api/presence`.
- `POST /api/presence` rejects invalid statuses with HTTP 400 and accepts `available`.
- Runtime privacy audit passed with no blockers across 85 source files after excluding generated build output.
- Browser QA loaded the dashboard, found all 10 feature panels, clicked each top-level action, checked desktop and mobile viewports, and observed zero console warnings/errors.
- iOS simulator QA passed with `xcodebuildmcp test_sim`: 3 unit tests, 0 failures.
- iOS simulator launch passed with `xcodebuildmcp build_run_sim`; runtime snapshots verified dashboard, actions, presence updates, picker values, and settings.

Screenshots from the latest QA pass:

- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-web-qa-desktop-final.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-web-qa-mobile-final.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-simulator-fixed.png`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-actions.jpg`
- `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-ios-presence-reviewing.jpg`

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
