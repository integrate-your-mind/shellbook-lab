# iOS App

Shellbook Lab includes a small native SwiftUI companion app in `ios/ShellbookLab`.

The app talks to the local Next.js dashboard API rather than reading Shellbook private state directly. It defaults to:

```text
http://127.0.0.1:8791
```

## Generate and Build

```sh
cd ios/ShellbookLab
xcodegen generate
xcodebuild -project ShellbookLab.xcodeproj -scheme ShellbookLab -destination 'platform=iOS Simulator,name=iPhone 17' test
```

## Runtime

Start the local dashboard before using the app:

```sh
npm run build
node dist/cli.js dashboard --host 127.0.0.1 --port 8791 --open false
```

The app provides:

- Dashboard: reads `/api/snapshot`.
- Actions: runs `/api/privacy` and `/api/handoff-preview`.
- Presence: reads and writes `/api/presence`.
- Settings: edits the local dashboard base URL.

`NSAllowsLocalNetworking` is enabled for local HTTP access only.
