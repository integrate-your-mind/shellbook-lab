# macOS App

The native macOS companion app lives in `macos/ShellbookLabMac`. It is a SwiftPM SwiftUI app that talks to the local Shellbook Lab dashboard API at `http://127.0.0.1:8791` by default.

## Surface

- `Dashboard`: health, handle, presence, metrics, and activity.
- `Mission Control`: local agent readiness from wrapped runs and presence.
- `Replay Timeline`: redacted wrapped-command history.
- `Actions`: privacy audit and handoff preview.
- `Presence`: read and update local presence.
- `Modules`: the ten Shellbook Lab extension areas.

The app uses a native `NavigationSplitView` sidebar and a normal `WindowGroup` so it behaves like a regular Dock app.

## Commands

```sh
npm run mac:test
npm run mac:build
npm run mac:run
```

The Codex app Run action points at:

```sh
./script/build_and_run.sh
```

The script builds the SwiftPM target, stages `dist/ShellbookLabMac.app`, launches it with `/usr/bin/open -n`, and supports `--debug`, `--logs`, `--telemetry`, and `--verify`.

On launch, the app places its main window on the preferred external display. It chooses the leftmost Samsung-family display when AppKit exposes one by name, then falls back to the leftmost display by geometry so QA runs do not open on the Built-in Retina Display.

## Verification

Current proof:

- `swift test --package-path macos/ShellbookLabMac` passed 3 tests.
- `./script/build_and_run.sh --verify` built the bundle, launched it, and verified the `ShellbookLabMac` process.

Known limitation:

- The macOS app expects the local web/API server to be running. Start it with `node dist/cli.js dashboard --host 127.0.0.1 --port 8791 --open false` or use the existing `shellbook-lab-dashboard` tmux session.
