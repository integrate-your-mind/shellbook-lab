# Shellbook Known Surfaces

Observed local install:

- Binary path: `~/.local/bin/shellbook`
- Version: `0.2.27`
- Default identity after setup: `@bunny`
- TUI command: `shellbook tui`
- Agent wrappers: `codex`, `claude`, `gemini`, `opencode`, and others through shell functions

Commands safe for read-oriented checks:

- `shellbook version`
- `shellbook setup check`
- `shellbook profile card`
- `shellbook statusline --style plain`

Commands that can communicate or mutate state and require explicit consent:

- `room post`
- `dm send`
- `friends ...`
- `presence serve`
- `sync push/all`
- `setup shell`
- `setup unshell`
- `upgrade`
- `uninstall`

Private local files such as `~/.shellbook/config.json` and `~/.shellbook/social.db` are treated as sensitive and are not parsed by Shellbook Lab.

