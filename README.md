# claude-code-notifier

macOS notification tool for Claude Code. Get notified when Claude needs your attention or finishes a task.

## Features

- **System Notification** — macOS notification center banner + sound (via [terminal-notifier](https://github.com/julienXX/terminal-notifier) or osascript)
- **Smart Focus Detection** — Optionally skip notifications when the terminal is in the foreground

Supports any terminal: iTerm2, Terminal.app, VS Code, Cursor, Windsurf, Ghostty, Warp, WezTerm, Alacritty, Kitty, and more.

## Install

```bash
npm install -g claude-code-notifier
claude-code-notifier setup
```

The setup wizard will check for [terminal-notifier](https://github.com/julienXX/terminal-notifier) and offer to install it via Homebrew if missing.

## Test

```bash
claude-code-notifier test
```

## Hook Events

| Event | When |
|---|---|
| `Notification` | Claude needs permission confirmation |
| `Stop` | Claude finished responding |

## Uninstall

```bash
claude-code-notifier uninstall
npm uninstall -g claude-code-notifier
```

## How It Works

The tool registers itself as a [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks). When Claude triggers a hook event, it runs `claude-code-notifier notify` which reads the event data from stdin and sends a macOS notification.

Zero npm dependencies. Notifications are sent via `terminal-notifier` (if installed) or macOS native `osascript`.

## Configuration

Config file: `~/.claude/claude-notifier.json`

```json
{
  "channels": ["system-notification"],
  "events": ["Notification", "Stop"],
  "sound": "Ping",
  "notifyWhenFocused": true
}
```

| Field | Description |
|---|---|
| `events` | Hook events to listen for: `Notification`, `Stop` |
| `sound` | Notification sound: `Ping`, `Glass`, `Hero`, `Pop`, `None` |
| `notifyWhenFocused` | `true` = always notify (default); `false` = only notify when terminal is in background |

## Requirements

- macOS
- Node.js >= 18
- Claude Code CLI

## License

MIT
