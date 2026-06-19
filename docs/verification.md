# Verification Notes

Verification gates for this repository:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Current local proof for the Next.js dashboard pass:

- `npm run lint` passed with the custom repository lint gate.
- `npm run typecheck` passed with TypeScript strict mode.
- `npm test` passed 10 Node test-runner tests after running `next build --webpack` and `tsc -p tsconfig.cli.json`.
- Node's experimental coverage report showed 68.77% line coverage across loaded compiled modules.
- Dashboard HTTP checks passed for `/`, `/api/snapshot`, `/api/privacy`, `/api/handoff-preview`, and `/api/presence`.
- `POST /api/presence` rejects invalid statuses with HTTP 400 and accepts `available`.
- Runtime privacy audit passed with no blockers across 61 source files after excluding `.next` build output.
- Headless Brave CDP smoke loaded the dashboard, found all 10 feature panels, clicked each top-level action, and saved screenshots:
  - `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-next-dashboard-desktop.png`
  - `/Users/romanmondello/Documents/Codex/2026-06-18/instal/outputs/shellbook-lab-next-dashboard-mobile.png`

Manual Shellbook checks performed before scaffolding:

- `shellbook version` returned `shellbook 0.2.27`
- `shellbook setup check` reported `identity: ok @bunny`
- Shellbook TUI opened in tmux session `shellbook-chat`

Known gaps:

- No Shellbook-native room/DM API is documented, so bot sending uses the public CLI only and is dry-run by default.
- No direct Shellbook DB parsing is used; analytics are based on wrapper events and public command output.
- GitHub PR watcher uses local git/gh evidence when available and degrades cleanly without a repo or token.
- Dashboard server, bridge, doctor, and handoff write paths still need deeper integration tests.
- The Playwright MCP transport was unavailable during visual QA, so screenshots and click smoke used local Brave CDP as fallback.
